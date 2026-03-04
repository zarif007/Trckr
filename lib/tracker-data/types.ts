/**
 * Shape of grid data: gridId -> array of row objects.
 * Matches the in-memory shape used by TrackerDisplayInline and getDataRef.
 */
export type GridDataSnapshot = Record<
  string,
  Array<Record<string, unknown>>
>

/** Body for creating a new TrackerData snapshot. */
export interface CreateTrackerDataBody {
  /** Optional label (e.g. "March 5", "Backup before migration"). */
  label?: string
  /** Full grid data snapshot. Required. */
  data: GridDataSnapshot
}

/** Body for updating an existing TrackerData snapshot. */
export interface UpdateTrackerDataBody {
  label?: string
  data?: GridDataSnapshot
}
