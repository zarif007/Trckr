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
  getGridRow,
  updateGridRow,
  deleteGridRow,
} from "@/lib/repositories/grid-row-repository";
import type { GridRowData } from "@/lib/schemas/tracker";
import { NodeType } from "@prisma/client";

const patchGridRowBodySchema = z
  .object({
    data: z.unknown().optional(),
    formStatus: z.string().nullable().optional(),
    statusTag: z.string().nullable().optional(),
  })
  .passthrough();

function extractRowData(
  data: unknown,
  gridSlug: string,
): GridRowData {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const maybeSnapshot = data as Record<string, unknown>;
    if (maybeSnapshot[gridSlug] && Array.isArray(maybeSnapshot[gridSlug])) {
      const rows = maybeSnapshot[gridSlug] as Array<Record<string, unknown>>;
      return (rows[0] ?? {}) as GridRowData;
    }
  }
  return data as GridRowData;
}

function wrapRowAsSnapshot(
  row: { id: string; gridId: string; data: unknown; statusTag: string | null; updatedAt: Date; sortOrder: number },
  gridSlug: string,
): {
  id: string;
  data: Record<string, Array<Record<string, unknown>>>;
  label: string | null;
  updatedAt: string;
  formStatus: string | null;
} {
  return {
    id: row.id,
    data: {
      [gridSlug]: [
        {
          ...(row.data as Record<string, unknown>),
          _rowId: row.id,
          _sortOrder: row.sortOrder,
        },
      ],
    },
    label: null,
    updatedAt: row.updatedAt.toISOString(),
    formStatus: row.statusTag,
  };
}

async function resolveGridSlug(gridId: string): Promise<string> {
  const node = await prisma.trackerNode.findFirst({
    where: { id: gridId, type: NodeType.GRID },
    select: { slug: true },
  });
  return node?.slug ?? gridId;
}

/**
 * GET /api/trackers/[id]/data/[dataId]
 * Return a single grid row wrapped in snapshot format for the UI.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { dataId } = await readParams(params);
  const rowId = requireParam(dataId, "data id");
  if (!rowId) return badRequest("Missing data id");

  const row = await getGridRow(rowId, authResult.user.id);
  if (!row) return notFound("Row not found");

  const gridSlug = await resolveGridSlug(row.gridId);
  return jsonOk(wrapRowAsSnapshot(row, gridSlug));
}

/**
 * PATCH /api/trackers/[id]/data/[dataId]
 * Update a single grid row's data or statusTag.
 *
 * Accepts `data` as either row-level data or a GridDataSnapshot.
 * If a snapshot is provided, the row data for this row's grid is extracted.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { dataId } = await readParams(params);
  const rowId = requireParam(dataId, "data id");
  if (!rowId) return badRequest("Missing data id");

  const rawBody = await request.json().catch(() => null);
  if (rawBody == null) return badRequest("Invalid JSON body");
  const parsedBody = patchGridRowBodySchema.safeParse(rawBody);
  if (!parsedBody.success) return badRequest("Invalid JSON body");
  const body = parsedBody.data;

  const existingRow = await getGridRow(rowId, authResult.user.id);
  if (!existingRow) return notFound("Row not found");

  const gridSlug = await resolveGridSlug(existingRow.gridId);

  const updateBody: {
    data?: GridRowData;
    statusTag?: string | null;
  } = {};

  if (body.data !== undefined) {
    updateBody.data = extractRowData(body.data, gridSlug);
  }
  const statusUpdate = body.formStatus ?? body.statusTag;
  if (statusUpdate !== undefined) updateBody.statusTag = statusUpdate;

  const updated = await updateGridRow(rowId, authResult.user.id, updateBody);
  if (!updated) return notFound("Row not found");

  return jsonOk(wrapRowAsSnapshot(updated, gridSlug));
}

/**
 * DELETE /api/trackers/[id]/data/[dataId]
 * Soft-delete a grid row.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { dataId } = await readParams(params);
  const rowId = requireParam(dataId, "data id");
  if (!rowId) return badRequest("Missing data id");

  const deleted = await deleteGridRow(rowId, authResult.user.id);
  if (!deleted) return notFound("Row not found");

  return jsonOk({ deleted: true });
}
