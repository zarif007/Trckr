import { prisma } from "@/lib/db";
import type { GridRowReferenceRecord } from "@/lib/schemas/tracker";
import {
  verifyGridRowOwnership,
  verifyMultipleGridRowsOwnership,
} from "./authorization-helpers";

/**
 * SECURITY: All functions now validate ownership before operations.
 * This prevents unauthorized access to cross-tracker references.
 */

export async function getReferencesFromRow(
  rowId: string,
  userId: string,
): Promise<GridRowReferenceRecord[]> {
  const { owned } = await verifyGridRowOwnership(rowId, userId);
  if (!owned) return [];

  return prisma.gridRowReference.findMany({
    where: { fromRowId: rowId, deletedAt: null },
  });
}

export async function getReferencesToRow(
  rowId: string,
  userId: string,
): Promise<GridRowReferenceRecord[]> {
  const { owned } = await verifyGridRowOwnership(rowId, userId);
  if (!owned) return [];

  return prisma.gridRowReference.findMany({
    where: { toRowId: rowId, deletedAt: null },
  });
}

export async function upsertReference(
  fromRowId: string,
  fromFieldId: string,
  toRowId: string,
  userId: string,
): Promise<GridRowReferenceRecord | null> {
  const { allOwned } = await verifyMultipleGridRowsOwnership(
    [fromRowId, toRowId],
    userId,
  );
  if (!allOwned) return null;

  return prisma.gridRowReference.upsert({
    where: {
      fromRowId_fromFieldId: { fromRowId, fromFieldId },
    },
    create: { fromRowId, fromFieldId, toRowId, deletedAt: null },
    update: { toRowId, deletedAt: null },
  });
}

export async function deleteReference(
  fromRowId: string,
  fromFieldId: string,
  userId: string,
): Promise<boolean> {
  const { owned } = await verifyGridRowOwnership(fromRowId, userId);
  if (!owned) return false;

  try {
    await prisma.gridRowReference.updateMany({
      where: { fromRowId, fromFieldId },
      data: { deletedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteAllReferencesFromRow(
  rowId: string,
  userId: string,
): Promise<number> {
  const { owned } = await verifyGridRowOwnership(rowId, userId);
  if (!owned) return 0;

  const result = await prisma.gridRowReference.updateMany({
    where: { fromRowId: rowId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count;
}

export async function countReferencesToRow(
  rowId: string,
  userId: string,
): Promise<number> {
  const { owned } = await verifyGridRowOwnership(rowId, userId);
  if (!owned) return 0;

  return prisma.gridRowReference.count({
    where: { toRowId: rowId, deletedAt: null },
  });
}
