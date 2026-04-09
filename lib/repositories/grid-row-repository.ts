import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
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
  } = {},
) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId } },
    select: { id: true },
  });
  if (!tracker) return null;

  const limit = Math.min(Math.max(1, options.limit ?? 100), 1000);
  const offset = Math.max(0, options.offset ?? 0);

  const where = {
    trackerId,
    gridId,
    branchName: options.branchName ?? "main",
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

// ---------------------------------------------------------------------------
// List all rows for a tracker (all grids), used for snapshot assembly
// ---------------------------------------------------------------------------

export async function listAllGridRowsForTracker(
  trackerId: string,
  userId: string,
  options: { branchName?: string } = {},
) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId } },
    select: { id: true },
  });
  if (!tracker) return null;

  return prisma.gridRow.findMany({
    where: {
      trackerId,
      branchName: options.branchName ?? "main",
      deletedAt: null,
    },
    orderBy: { sortOrder: "asc" },
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
