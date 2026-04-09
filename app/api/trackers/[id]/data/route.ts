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
  listAllGridRowsForTracker,
  createGridRow,
  upsertGridRows,
} from "@/lib/repositories/grid-row-repository";
import type { GridRowData } from "@/lib/schemas/tracker";
import { NodeType } from "@prisma/client";

const saveDataBodySchema = z
  .object({
    formStatus: z.string().nullable().optional(),
    data: z.unknown().optional(),
    branchName: z.string().optional(),
    label: z.string().optional(),
  })
  .passthrough();

type GridIdSlugPair = { id: string; slug: string };

function buildSnapshotFromRows(
  rows: Array<{ id: string; gridId: string; data: unknown; sortOrder: number; updatedAt: Date }>,
  gridIdToSlug: Map<string, string>,
): { data: Record<string, Array<Record<string, unknown>>>; updatedAt: string } {
  const grouped: Record<string, Array<Record<string, unknown>>> = {};
  let latestUpdatedAt = new Date(0);
  for (const row of rows) {
    const gridSlug = gridIdToSlug.get(row.gridId) ?? row.gridId;
    if (!grouped[gridSlug]) grouped[gridSlug] = [];
    grouped[gridSlug].push({
      ...(row.data as Record<string, unknown>),
      _rowId: row.id,
      _sortOrder: row.sortOrder,
    });
    if (row.updatedAt > latestUpdatedAt) latestUpdatedAt = row.updatedAt;
  }
  return { data: grouped, updatedAt: latestUpdatedAt.toISOString() };
}

/**
 * GET /api/trackers/[id]/data
 *
 * Two modes:
 * - Snapshot mode (default): Returns all rows grouped by gridSlug as a snapshot.
 * - Instance mode: When `limit` or `offset` are provided, returns paginated
 *   individual rows as instances (used by multi-instance list views).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  if (!trackerId) return badRequest("Missing tracker id");

  const { searchParams } = new URL(request.url);
  const branchName = searchParams.get("branch") ?? "main";
  const viewMode = searchParams.get("view");

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      nodes: { where: { type: NodeType.GRID }, select: { id: true, slug: true } },
    },
  });
  if (!tracker) return notFound("Tracker not found");

  const gridIdToSlug = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.id, n.slug]));

  if (viewMode === "instances") {
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50), 1000);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const where = { trackerId, branchName, deletedAt: null as Date | null };
    const [rows, total] = await Promise.all([
      prisma.gridRow.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.gridRow.count({ where }),
    ]);

    const items = rows.map((row) => {
      const gridSlug = gridIdToSlug.get(row.gridId) ?? row.gridId;
      return {
        id: row.id,
        label: null as string | null,
        data: {
          [gridSlug]: [
            {
              ...(row.data as Record<string, unknown>),
              _rowId: row.id,
              _sortOrder: row.sortOrder,
            },
          ],
        },
        branchName: row.branchName,
        author: row.createdByUser ?? null,
        authorId: row.createdBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        formStatus: row.statusTag,
      };
    });

    return jsonOk({ items, total });
  }

  const rows = await listAllGridRowsForTracker(trackerId, authResult.user.id, {
    branchName,
  });
  if (!rows) return notFound("Tracker not found");

  const { data, updatedAt } = buildSnapshotFromRows(rows, gridIdToSlug);

  return jsonOk({ data, total: rows.length, updatedAt });
}

/**
 * POST /api/trackers/[id]/data
 * Bulk save grid rows for a tracker (snapshot-style).
 *
 * For SINGLE-instance trackers: replaces all rows in each grid (upsert).
 * For MULTI-instance trackers: creates new rows (append) and returns
 * the first created row's ID as the instance identifier.
 *
 * Body: { data: Record<gridSlug, Row[]>, formStatus?, branchName?, label? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  if (!trackerId) return badRequest("Missing tracker id");

  const rawBody = await request.json().catch(() => null);
  if (rawBody == null) return badRequest("Invalid JSON body");
  const parsedBody = saveDataBodySchema.safeParse(rawBody);
  if (!parsedBody.success) return badRequest("Invalid JSON body");
  const body = parsedBody.data;

  if (
    body.data === undefined ||
    typeof body.data !== "object" ||
    body.data === null
  ) {
    return badRequest("Missing or invalid data");
  }

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      instance: true,
      schemaVersion: true,
      nodes: { where: { type: "GRID" }, select: { id: true, slug: true } },
    },
  });
  if (!tracker) return notFound("Tracker not found");

  const gridSlugToId = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.slug, n.id]));
  const gridIdToSlug = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.id, n.slug]));
  const snapshot = body.data as Record<string, Array<Record<string, unknown>>>;
  const branchName = body.branchName ?? "main";
  const statusTag = body.formStatus ?? null;

  if (tracker.instance === "MULTI") {
    let firstRowId: string | null = null;
    const createdRows: Array<{ id: string; gridId: string; data: unknown; sortOrder: number; updatedAt: Date }> = [];

    for (const [gridSlug, rows] of Object.entries(snapshot)) {
      const gridId = gridSlugToId.get(gridSlug);
      if (!gridId || !Array.isArray(rows)) continue;

      for (const rowData of rows) {
        const created = await createGridRow({
          trackerId,
          gridId,
          userId: authResult.user.id,
          data: rowData as GridRowData,
          schemaVersion: String(tracker.schemaVersion),
          statusTag,
          branchName,
        });
        if (created) {
          if (!firstRowId) firstRowId = created.id;
          createdRows.push(created);
        }
      }
    }

    const { data: responseData, updatedAt } = buildSnapshotFromRows(createdRows, gridIdToSlug);
    return jsonOk({
      id: firstRowId ?? trackerId,
      data: responseData,
      label: body.label ?? null,
      updatedAt,
      formStatus: statusTag,
    });
  }

  for (const [gridSlug, rows] of Object.entries(snapshot)) {
    const gridId = gridSlugToId.get(gridSlug);
    if (!gridId || !Array.isArray(rows)) continue;

    await upsertGridRows({
      trackerId,
      gridId,
      userId: authResult.user.id,
      rows: rows.map((row, i) => ({
        data: row as GridRowData,
        sortOrder: i + 1,
      })),
      schemaVersion: String(tracker.schemaVersion),
      branchName,
      statusTag,
    });
  }

  const savedRows = await listAllGridRowsForTracker(trackerId, authResult.user.id, {
    branchName,
  });
  const { data: responseData, updatedAt } = buildSnapshotFromRows(
    savedRows ?? [],
    gridIdToSlug,
  );

  return jsonOk({
    id: trackerId,
    data: responseData,
    label: body.label ?? null,
    updatedAt,
    formStatus: statusTag,
  });
}
