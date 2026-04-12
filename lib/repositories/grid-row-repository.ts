import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertSafeJsonPathKey } from "@/lib/grid-data-loading";
import type { GridRowRecord, GridRowData } from "@/lib/schemas/tracker";
import {
  getCompiledValidator,
  validateRowData,
  type RowValidationResult,
} from "@/lib/tracker-schema/validate-row";

export { type RowValidationResult } from "@/lib/tracker-schema/validate-row";

/**
 * Validate row data against the tracker's field definitions.
 * Returns validation result without blocking the write.
 */
export async function validateGridRowData(
  trackerId: string,
  gridId: string,
  data: GridRowData,
): Promise<RowValidationResult> {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId },
    select: {
      schemaVersion: true,
      fields: { select: { slug: true, dataType: true } },
      layoutNodes: { select: { gridId: true, fieldId: true } },
    },
  });
  if (!tracker) return { valid: true, errors: [] };

  const fieldDefs = tracker.fields.map((f) => ({
    slug: f.slug,
    dataType: f.dataType,
  }));
  const layoutDefs = tracker.layoutNodes.map((ln) => ({
    gridId: ln.gridId,
    fieldId: ln.fieldId,
  }));

  const validator = getCompiledValidator(
    trackerId,
    gridId,
    tracker.schemaVersion,
    fieldDefs,
    layoutDefs,
  );

  return validateRowData(data as Record<string, unknown>, validator);
}

const authorInclude = {
  createdByUser: {
    select: { id: true, name: true, email: true },
  },
} as const;

// ---------------------------------------------------------------------------
// List rows for a grid
// ---------------------------------------------------------------------------

export async function listGridRows(
  trackerId: string,
  gridId: string,
  userId: string,
  options: {
    branchName?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
    /**
     * Field id (JSON key on `row.data`). When set, filter rows by that key.
     * v1: string equality only; multiselect / array group values are not supported.
     */
    groupFieldKey?: string;
    /** Match `data[groupFieldKey]` as text; empty string = null, missing, or "". */
    groupValue?: string;
  } = {},
) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId } },
    select: { id: true },
  });
  if (!tracker) return null;

  const limit = Math.min(Math.max(1, options.limit ?? 100), 1000);
  const offset = Math.max(0, options.offset ?? 0);
  const branchName = options.branchName ?? "main";

  const useGroupFilter =
    options.groupFieldKey != null && options.groupFieldKey.length > 0;

  if (useGroupFilter) {
    assertSafeJsonPathKey(options.groupFieldKey!);
    const key = options.groupFieldKey!;
    const keyLit = Prisma.raw(`'${key}'`);
    const gv = options.groupValue ?? "";

    const conditions: Prisma.Sql[] = [
      Prisma.sql`r."trackerId" = ${trackerId}`,
      Prisma.sql`r."gridId" = ${gridId}`,
      Prisma.sql`r."branchName" = ${branchName}`,
    ];
    if (!options.includeDeleted) {
      conditions.push(Prisma.sql`r."deletedAt" IS NULL`);
    }
    if (gv === "") {
      conditions.push(
        Prisma.sql`((r.data->>${keyLit}) IS NULL OR (r.data->>${keyLit}) = '')`,
      );
    } else {
      conditions.push(Prisma.sql`(r.data->>${keyLit}) = ${gv}`);
    }
    const whereSql = Prisma.join(conditions, " AND ");

    const [idPage, countRows] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>`
        SELECT r.id FROM "GridRow" r
        WHERE ${whereSql}
        ORDER BY r."sortOrder" ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<[{ c: bigint }]>`
        SELECT COUNT(*)::bigint AS c FROM "GridRow" r
        WHERE ${whereSql}
      `,
    ]);

    const ids = idPage.map((row) => row.id);
    const total = Number(countRows[0]?.c ?? 0);

    if (ids.length === 0) {
      return { items: [], total };
    }

    const itemsUnordered = await prisma.gridRow.findMany({
      where: { id: { in: ids } },
      include: authorInclude,
    });
    const byId = new Map(itemsUnordered.map((row) => [row.id, row]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => row != null);

    return { items, total };
  }

  const where = {
    trackerId,
    gridId,
    branchName,
    ...(options.includeDeleted ? {} : { deletedAt: null }),
  };

  const [items, total] = await Promise.all([
    prisma.gridRow.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      take: limit,
      skip: offset,
      include: authorInclude,
    }),
    prisma.gridRow.count({ where }),
  ]);

  return { items, total };
}

/**
 * Distinct non-empty string values for one JSON key on row `data` (kanban / grouping).
 * Uses `->>` so numbers/booleans match the same string form as the row list filter.
 *
 * Consumed by `GET .../distinct-field-values` and merged client-side by
 * `buildKanbanGroupColumnDescriptors` — see `lib/tracker-grid-rows/kanban-column-discovery/README.md`.
 */
export async function listDistinctDataValuesForGridField(
  trackerId: string,
  gridId: string,
  userId: string,
  fieldKey: string,
  options: { branchName?: string; limit?: number } = {},
): Promise<{ values: string[] } | null> {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId } },
    select: { id: true },
  });
  if (!tracker) return null;

  assertSafeJsonPathKey(fieldKey);
  const keyLit = Prisma.raw(`'${fieldKey}'`);
  const branchName = options.branchName ?? "main";
  const limit = Math.min(Math.max(1, options.limit ?? 500), 500);

  const rows = await prisma.$queryRaw<{ v: string | null }[]>`
    SELECT DISTINCT (r.data->>${keyLit}) AS v
    FROM "GridRow" r
    WHERE r."trackerId" = ${trackerId}
      AND r."gridId" = ${gridId}
      AND r."branchName" = ${branchName}
      AND r."deletedAt" IS NULL
      AND (r.data->>${keyLit}) IS NOT NULL
      AND (r.data->>${keyLit}) != ''
    ORDER BY v ASC
    LIMIT ${limit}
  `;

  const values = rows
    .map((row) => (row.v == null ? "" : String(row.v).trim()))
    .filter(Boolean);
  return { values };
}

// ---------------------------------------------------------------------------
// List all rows for a tracker (all grids), used for snapshot assembly
// ---------------------------------------------------------------------------

export async function listAllGridRowsForTracker(
  trackerId: string,
  userId: string,
  options: {
    branchName?: string;
    excludeGridIds?: string[];
    limit?: number;
  } = {},
) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId } },
    select: { id: true },
  });
  if (!tracker) return null;

  const exclude = options.excludeGridIds?.filter(Boolean) ?? [];

  return prisma.gridRow.findMany({
    where: {
      trackerId,
      branchName: options.branchName ?? "main",
      deletedAt: null,
      ...(exclude.length > 0 ? { gridId: { notIn: exclude } } : {}),
    },
    orderBy: { sortOrder: "asc" },
    ...(options.limit ? { take: options.limit } : {}),
    include: authorInclude,
  });
}

// ---------------------------------------------------------------------------
// Get single row
// ---------------------------------------------------------------------------

export async function getGridRow(rowId: string, userId: string) {
  const row = await prisma.gridRow.findFirst({
    where: { id: rowId },
    include: {
      tracker: { select: { project: { select: { userId: true } } } },
      ...authorInclude,
    },
  });
  if (!row || row.tracker.project.userId !== userId) return null;
  const { tracker, ...rest } = row;
  void tracker;
  return rest;
}

// ---------------------------------------------------------------------------
// Create row with fractional ordering
// ---------------------------------------------------------------------------

export async function createGridRow(params: {
  trackerId: string;
  gridId: string;
  userId: string;
  data: GridRowData;
  schemaVersion: string;
  statusTag?: string | null;
  branchName?: string;
  afterRowId?: string;
}) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: params.trackerId, project: { userId: params.userId } },
    select: { id: true },
  });
  if (!tracker) return null;

  let sortOrder: number;

  if (params.afterRowId) {
    const afterRow = await prisma.gridRow.findUnique({
      where: { id: params.afterRowId },
      select: { sortOrder: true },
    });
    const nextRow = afterRow
      ? await prisma.gridRow.findFirst({
          where: {
            trackerId: params.trackerId,
            gridId: params.gridId,
            branchName: params.branchName ?? "main",
            deletedAt: null,
            sortOrder: { gt: afterRow.sortOrder },
          },
          orderBy: { sortOrder: "asc" },
          select: { sortOrder: true },
        })
      : null;

    if (afterRow && nextRow) {
      sortOrder = (afterRow.sortOrder + nextRow.sortOrder) / 2;
    } else if (afterRow) {
      sortOrder = afterRow.sortOrder + 1;
    } else {
      sortOrder = 1;
    }
  } else {
    const lastRow = await prisma.gridRow.findFirst({
      where: {
        trackerId: params.trackerId,
        gridId: params.gridId,
        branchName: params.branchName ?? "main",
        deletedAt: null,
      },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    sortOrder = lastRow ? lastRow.sortOrder + 1 : 1;
  }

  return prisma.gridRow.create({
    data: {
      trackerId: params.trackerId,
      gridId: params.gridId,
      data: params.data as Prisma.InputJsonValue,
      schemaVersion: params.schemaVersion,
      statusTag: params.statusTag ?? null,
      sortOrder,
      branchName: params.branchName ?? "main",
      createdBy: params.userId,
    },
    include: authorInclude,
  });
}

// ---------------------------------------------------------------------------
// Update row
// ---------------------------------------------------------------------------

export async function updateGridRow(
  rowId: string,
  userId: string,
  body: {
    data?: GridRowData;
    statusTag?: string | null;
    sortOrder?: number;
  },
) {
  const row = await prisma.gridRow.findFirst({
    where: { id: rowId },
    include: {
      tracker: { select: { project: { select: { userId: true } } } },
    },
  });
  if (!row || row.tracker.project.userId !== userId) return null;

  const updateData: Record<string, unknown> = {};
  if (body.data !== undefined) {
    updateData.data = body.data;
    updateData.version = row.version + 1;
  }
  if (body.statusTag !== undefined) updateData.statusTag = body.statusTag;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  if (Object.keys(updateData).length === 0) return row;

  return prisma.gridRow.update({
    where: { id: rowId },
    data: updateData,
    include: authorInclude,
  });
}

// ---------------------------------------------------------------------------
// Soft delete
// ---------------------------------------------------------------------------

export async function deleteGridRow(rowId: string, userId: string) {
  const row = await prisma.gridRow.findFirst({
    where: { id: rowId },
    include: {
      tracker: { select: { project: { select: { userId: true } } } },
    },
  });
  if (!row || row.tracker.project.userId !== userId) return false;

  await prisma.gridRow.update({
    where: { id: rowId },
    data: { deletedAt: new Date() },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Bulk upsert for auto-save (replace all rows in a grid)
// ---------------------------------------------------------------------------

export async function upsertGridRows(params: {
  trackerId: string;
  gridId: string;
  userId: string;
  rows: Array<{ data: GridRowData; sortOrder: number }>;
  schemaVersion: string;
  branchName?: string;
  statusTag?: string | null;
}) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: params.trackerId, project: { userId: params.userId } },
    select: { id: true },
  });
  if (!tracker) return null;

  const branchName = params.branchName ?? "main";

  return prisma.$transaction(async (tx) => {
    await tx.gridRow.deleteMany({
      where: {
        trackerId: params.trackerId,
        gridId: params.gridId,
        branchName,
      },
    });

    if (params.rows.length === 0) return [];

    await tx.gridRow.createMany({
      data: params.rows.map((row) => ({
        trackerId: params.trackerId,
        gridId: params.gridId,
        data: row.data as Prisma.InputJsonValue,
        sortOrder: row.sortOrder,
        schemaVersion: params.schemaVersion,
        statusTag: params.statusTag ?? null,
        branchName,
        createdBy: params.userId,
      })),
    });

    return tx.gridRow.findMany({
      where: {
        trackerId: params.trackerId,
        gridId: params.gridId,
        branchName,
      },
      orderBy: { sortOrder: "asc" },
      include: authorInclude,
    });
  });
}

// ---------------------------------------------------------------------------
// Move row (fractional reindexing)
// ---------------------------------------------------------------------------

export async function moveGridRow(
  rowId: string,
  userId: string,
  targetIndex: number,
) {
  const row = await prisma.gridRow.findFirst({
    where: { id: rowId },
    include: {
      tracker: { select: { project: { select: { userId: true } } } },
    },
  });
  if (!row || row.tracker.project.userId !== userId) return null;

  const allRows = await prisma.gridRow.findMany({
    where: {
      trackerId: row.trackerId,
      gridId: row.gridId,
      branchName: row.branchName,
      deletedAt: null,
      id: { not: rowId },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });

  const clamped = Math.max(0, Math.min(targetIndex, allRows.length));

  const left = clamped > 0 ? allRows[clamped - 1]!.sortOrder : null;
  const right = clamped < allRows.length ? allRows[clamped]!.sortOrder : null;

  let newSortOrder: number;
  if (left != null && right != null) {
    newSortOrder = (left + right) / 2;
  } else if (left != null) {
    newSortOrder = left + 1;
  } else if (right != null) {
    newSortOrder = right - 1;
  } else {
    newSortOrder = 1;
  }

  return prisma.gridRow.update({
    where: { id: rowId },
    data: { sortOrder: newSortOrder },
    include: authorInclude,
  });
}

// ---------------------------------------------------------------------------
// Typed helper to map DB rows → GridRowRecord
// ---------------------------------------------------------------------------

export function toGridRowRecord(
  row: { id: string; trackerId: string; gridId: string; data: unknown; schemaVersion: string; version: number; statusTag: string | null; sortOrder: number; branchName: string; isMerged: boolean; deletedAt: Date | null; createdBy: string | null; createdAt: Date; updatedAt: Date },
): GridRowRecord {
  return {
    id: row.id,
    trackerId: row.trackerId,
    gridId: row.gridId,
    data: row.data as GridRowData,
    schemaVersion: row.schemaVersion,
    version: row.version,
    statusTag: row.statusTag,
    sortOrder: row.sortOrder,
    branchName: row.branchName,
    isMerged: row.isMerged,
    deletedAt: row.deletedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
