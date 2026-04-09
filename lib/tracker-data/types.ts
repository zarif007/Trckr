/**
 * Shape of grid data: gridId -> array of row objects.
 * Used as the in-memory representation by TrackerDisplayInline and getDataRef.
 * In the normalized DB, each entry becomes a GridRow record.
 */
export type GridDataSnapshot = Record<string, Array<Record<string, unknown>>>;

/** Body for creating grid row data (used by API). */
export interface CreateGridRowBody {
  data: Record<string, unknown>;
  statusTag?: string | null;
  branchName?: string;
}

/** Body for updating grid row data. */
export interface UpdateGridRowBody {
  data?: Record<string, unknown>;
  statusTag?: string | null;
}
