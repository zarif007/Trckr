import {
  createTrackerData,
  deleteTrackerData,
  getTrackerData,
  listTrackerData,
  updateTrackerData,
} from '@/lib/tracker-data'
import type { GridDataSnapshot } from '@/lib/tracker-data'

export async function listTrackerSnapshotsForUser(
  trackerId: string,
  userId: string,
  options: { limit?: number; offset?: number },
) {
  return listTrackerData(trackerId, userId, options)
}

export async function createTrackerSnapshotForUser(
  trackerId: string,
  userId: string,
  body: {
    label?: string
    data: GridDataSnapshot
    branchName?: string
    basedOnId?: string
    authorId?: string
  },
) {
  return createTrackerData(trackerId, userId, body)
}

export async function getTrackerSnapshotForUser(snapshotId: string, userId: string) {
  return getTrackerData(snapshotId, userId)
}

export async function updateTrackerSnapshotForUser(
  snapshotId: string,
  userId: string,
  body: { label?: string; data?: GridDataSnapshot },
) {
  return updateTrackerData(snapshotId, userId, body)
}

export async function deleteTrackerSnapshotForUser(snapshotId: string, userId: string) {
  return deleteTrackerData(snapshotId, userId)
}
