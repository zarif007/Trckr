/**
 * Build tracker grid snapshots for workflow dispatch (diff vs persisted rows).
 */

import { listAllGridRowsForTracker } from "@/lib/repositories/grid-row-repository";

export async function loadTrackerSnapshotGrids(
  trackerId: string,
  userId: string,
  gridIdToSlug: Map<string, string>,
  branchName = "main",
): Promise<Record<string, Record<string, unknown>[]>> {
  const rows = await listAllGridRowsForTracker(trackerId, userId, {
    branchName,
  });
  const grouped: Record<string, Record<string, unknown>[]> = {};
  for (const row of rows ?? []) {
    const slug = gridIdToSlug.get(row.gridId) ?? row.gridId;
    if (!grouped[slug]) grouped[slug] = [];
    grouped[slug].push({
      ...(row.data as Record<string, unknown>),
      _rowId: row.id,
      _sortOrder: row.sortOrder,
    });
  }
  return grouped;
}
