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
  createGridRow,
  listGridRows,
} from "@/lib/repositories/grid-row-repository";
import type { GridRowData } from "@/lib/schemas/tracker";
import { NodeType } from "@prisma/client";

const postBodySchema = z.object({
  data: z.record(z.string(), z.unknown()),
  branchName: z.string().optional(),
  formStatus: z.string().nullable().optional(),
});

function rowToClientShape(
  row: {
    id: string;
    data: unknown;
    sortOrder: number;
  },
  gridSlug: string,
): Record<string, unknown> {
  void gridSlug;
  return {
    ...(row.data as Record<string, unknown>),
    _rowId: row.id,
    _sortOrder: row.sortOrder,
  };
}

/**
 * GET /api/trackers/[id]/grids/[gridSlug]/rows
 * POST /api/trackers/[id]/grids/[gridSlug]/rows
 *
 * Paginated rows for one grid (slug = assembled `grid.id`). Optional kanban filter
 * via groupFieldId + groupValue (empty groupValue = uncategorized).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; gridSlug: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id, gridSlug } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  const slug = requireParam(gridSlug, "grid slug");
  if (!trackerId || !slug) return badRequest("Missing params");

  const { searchParams } = new URL(request.url);
  const branchName = searchParams.get("branch") ?? "main";
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50),
    1000,
  );
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const groupFieldId = searchParams.get("groupFieldId") ?? undefined;
  const groupValue =
    searchParams.get("groupValue") !== null
      ? (searchParams.get("groupValue") ?? "")
      : undefined;

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      schemaVersion: true,
      nodes: {
        where: { type: NodeType.GRID, slug },
        select: { id: true, slug: true },
      },
    },
  });
  if (!tracker) return notFound("Tracker not found");
  const gridNode = tracker.nodes[0];
  if (!gridNode) return notFound("Grid not found");

  const result = await listGridRows(trackerId, gridNode.id, authResult.user.id, {
    branchName,
    limit,
    offset,
    ...(groupFieldId
      ? { groupFieldKey: groupFieldId, groupValue: groupValue ?? "" }
      : {}),
  });
  if (!result) return notFound("Tracker not found");

  const rows = result.items.map((row) =>
    rowToClientShape(row, gridNode.slug),
  );

  return jsonOk({
    rows,
    total: result.total,
    gridSlug: gridNode.slug,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; gridSlug: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id, gridSlug } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  const slug = requireParam(gridSlug, "grid slug");
  if (!trackerId || !slug) return badRequest("Missing params");

  const rawBody = await request.json().catch(() => null);
  if (rawBody == null) return badRequest("Invalid JSON body");
  const parsed = postBodySchema.safeParse(rawBody);
  if (!parsed.success) return badRequest("Invalid JSON body");
  const body = parsed.data;

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      schemaVersion: true,
      nodes: {
        where: { type: NodeType.GRID, slug },
        select: { id: true, slug: true },
      },
    },
  });
  if (!tracker) return notFound("Tracker not found");
  const gridNode = tracker.nodes[0];
  if (!gridNode) return notFound("Grid not found");

  const created = await createGridRow({
    trackerId,
    gridId: gridNode.id,
    userId: authResult.user.id,
    data: body.data as GridRowData,
    schemaVersion: String(tracker.schemaVersion),
    statusTag: body.formStatus ?? null,
    branchName: body.branchName ?? "main",
  });
  if (!created) return notFound("Tracker not found");

  return jsonOk({
    row: rowToClientShape(created, gridNode.slug),
    gridSlug: gridNode.slug,
  });
}
