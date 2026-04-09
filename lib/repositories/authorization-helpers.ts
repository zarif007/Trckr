import { prisma } from "@/lib/db";

/**
 * Authorization helpers for cross-entity validation.
 * Use these before any write operation involving user-owned resources.
 */

export async function verifyTrackerOwnership(
  trackerId: string,
  userId: string,
): Promise<boolean> {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId } },
    select: { id: true },
  });
  return !!tracker;
}

export async function verifyGridRowOwnership(
  rowId: string,
  userId: string,
): Promise<{ owned: boolean; trackerId?: string }> {
  const row = await prisma.gridRow.findFirst({
    where: { id: rowId },
    select: {
      trackerId: true,
      tracker: { select: { project: { select: { userId: true } } } },
    },
  });

  if (!row || row.tracker.project.userId !== userId) {
    return { owned: false };
  }

  return { owned: true, trackerId: row.trackerId };
}

export async function verifyMultipleGridRowsOwnership(
  rowIds: string[],
  userId: string,
): Promise<{ allOwned: boolean; invalidIds: string[] }> {
  const rows = await prisma.gridRow.findMany({
    where: { id: { in: rowIds } },
    select: {
      id: true,
      tracker: { select: { project: { select: { userId: true } } } },
    },
  });

  const foundIds = new Set(rows.map((r) => r.id));
  const invalidIds = rowIds.filter((id) => {
    const row = rows.find((r) => r.id === id);
    return !row || row.tracker.project.userId !== userId;
  });

  return {
    allOwned: invalidIds.length === 0,
    invalidIds,
  };
}

/**
 * Verify user can access a foreign tracker (for bindings).
 * Returns null if tracker doesn't exist or user lacks access.
 */
export async function verifyForeignTrackerAccess(
  sourceSchemaId: string,
  userId: string,
): Promise<{ id: string; projectId: string } | null> {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: sourceSchemaId, project: { userId } },
    select: { id: true, projectId: true },
  });
  return tracker;
}
