/**
 * Shape of grid data: gridId -> array of row objects.
 * Matches the in-memory shape used by TrackerDisplayInline and getDataRef.
 */
export type GridDataSnapshot = Record<string, Array<Record<string, unknown>>>;

/** Body for creating a new TrackerData snapshot or branch. */
export interface CreateTrackerDataBody {
  /** Optional label (e.g. "March 5", "Backup before migration"). */
  label?: string;
  /** Optional form status tag (e.g. Draft, Submitted). */
  formStatus?: string | null;
  /** Full grid data snapshot. Required. */
  data: GridDataSnapshot;
  /** Branch name for VC mode (default: "main"). */
  branchName?: string;
  /** ID of the TrackerData record this branch was derived from. */
  basedOnId?: string;
  /** User ID of the author creating this branch/instance. */
  authorId?: string;
}

/** Body for updating an existing TrackerData snapshot. */
export interface UpdateTrackerDataBody {
  label?: string;
  formStatus?: string | null;
  data?: GridDataSnapshot;
}
