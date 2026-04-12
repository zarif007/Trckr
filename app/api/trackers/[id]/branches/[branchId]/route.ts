import { z } from "zod";
import {
  badRequest,
  jsonOk,
  notFound,
  readParams,
  requireParam,
} from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import {
  ROW_ACCENT_HEX_CLIENT_KEY,
  parseRowAccentHex,
} from "@/lib/tracker-grid-rows/row-accent-hex";
import { rowPayloadForPatch } from "@/lib/tracker-grid-rows/row-utils";
import { NodeType } from "@prisma/client";

const updateBranchBodySchema = z.object({
  data: z.unknown().optional(),
  formStatus: z.string().nullable().optional(),
  statusTag: z.string().nullable().optional(),
});

type GridIdSlugPair = { id: string; slug: string };

function groupRowsByGridSlug(
  rows: Array<{
    id: string;
    gridId: string;
    data: unknown;
    sortOrder: number;
    rowAccentHex: string | null;
  }>,
  gridIdToSlug: Map<string, string>,
): Record<string, Array<Record<string, unknown>>> {
  const grouped: Record<string, Array<Record<string, unknown>>> = {};
  for (const row of rows) {
    const gridSlug = gridIdToSlug.get(row.gridId) ?? row.gridId;
    if (!grouped[gridSlug]) grouped[gridSlug] = [];
    grouped[gridSlug].push({
      ...(row.data as Record<string, unknown>),
      _rowId: row.id,
      _sortOrder: row.sortOrder,
      ...(row.rowAccentHex != null ? { _rowAccentHex: row.rowAccentHex } : {}),
    });
  }
  return grouped;
}

/**
 * GET /api/trackers/[id]/branches/[branchId]
 * Get all rows for a specific branch (branchId is the branch name).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; branchId: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id, branchId } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  const branchName = requireParam(branchId, "branch name");
  if (!trackerId) return badRequest("Missing tracker id");
  if (!branchName) return badRequest("Missing branch name");

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      nodes: { where: { type: NodeType.GRID }, select: { id: true, slug: true } },
    },
  });
  if (!tracker) return notFound("Tracker not found");

  const gridIdToSlug = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.id, n.slug]));

  const rows = await prisma.gridRow.findMany({
    where: { trackerId, branchName, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  const data = groupRowsByGridSlug(rows, gridIdToSlug);
  const latestRow = rows.length > 0 ? rows[rows.length - 1] : null;

  return jsonOk({
    id: branchName,
    branchName,
    data,
    label: branchName,
    updatedAt: latestRow?.updatedAt?.toISOString(),
    formStatus: latestRow?.statusTag ?? null,
    author: latestRow?.createdByUser ?? null,
    rowCount: rows.length,
    isMerged: rows.some((r) => r.isMerged),
  });
}

/**
 * PATCH /api/trackers/[id]/branches/[branchId]
 * Bulk update all rows for a branch (save snapshot).
 *
 * Returns the full branch record shape expected by the save hook.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; branchId: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id, branchId } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  const branchName = requireParam(branchId, "branch name");
  if (!trackerId) return badRequest("Missing tracker id");
  if (!branchName) return badRequest("Missing branch name");

  const rawBody = await request.json().catch(() => null);
  if (rawBody == null) return badRequest("Invalid JSON body");
  const parsedBody = updateBranchBodySchema.safeParse(rawBody);
  if (!parsedBody.success) return badRequest(parsedBody.error.message);
  const body = parsedBody.data;

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      schemaVersion: true,
      nodes: { where: { type: NodeType.GRID }, select: { id: true, slug: true } },
    },
  });
  if (!tracker) return notFound("Tracker not found");

  const gridSlugToId = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.slug, n.id]));
  const gridIdToSlug = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.id, n.slug]));
  const statusTag = body.formStatus ?? body.statusTag ?? null;

  if (
    body.data !== undefined &&
    typeof body.data === "object" &&
    body.data !== null
  ) {
    const snapshot = body.data as Record<string, Array<Record<string, unknown>>>;

    await prisma.$transaction(async (tx) => {
      await tx.gridRow.deleteMany({
        where: { trackerId, branchName },
      });

      const creates: Array<{
        trackerId: string;
        gridId: string;
        data: object;
        schemaVersion: string;
        sortOrder: number;
        branchName: string;
        statusTag: string | null;
        rowAccentHex: string | null;
        createdBy: string;
      }> = [];

      for (const [gridSlug, rows] of Object.entries(snapshot)) {
        const gridId = gridSlugToId.get(gridSlug);
        if (!gridId || !Array.isArray(rows)) continue;
        for (let i = 0; i < rows.length; i++) {
          const raw = rows[i] as Record<string, unknown>;
          creates.push({
            trackerId,
            gridId,
            data: rowPayloadForPatch(raw) as object,
            schemaVersion: String(tracker.schemaVersion),
            sortOrder: i + 1,
            branchName,
            statusTag,
            rowAccentHex: parseRowAccentHex(raw[ROW_ACCENT_HEX_CLIENT_KEY]),
            createdBy: authResult.user.id,
          });
        }
      }

      if (creates.length > 0) {
        await tx.gridRow.createMany({ data: creates });
      }
    });
  }

  const savedRows = await prisma.gridRow.findMany({
    where: { trackerId, branchName, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  const data = groupRowsByGridSlug(savedRows, gridIdToSlug);
  const latestRow = savedRows.length > 0 ? savedRows[savedRows.length - 1] : null;

  return jsonOk({
    id: branchName,
    branchName,
    data,
    label: branchName,
    updatedAt: latestRow?.updatedAt?.toISOString() ?? new Date().toISOString(),
    formStatus: statusTag,
    author: latestRow?.createdByUser ?? null,
    rowCount: savedRows.length,
    isMerged: false,
  });
}
