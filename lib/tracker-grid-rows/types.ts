/**
 * JSON body for GET `/api/trackers/[id]/grids/[gridSlug]/rows`.
 * Kept in sync with the route handler response shape.
 */
export type GridRowsListResponseJson = {
  rows?: Record<string, unknown>[];
  total?: number;
  error?: string;
  gridSlug?: string;
};

export type GridRowsCreateResponseJson = {
  row?: Record<string, unknown>;
  error?: string;
  gridSlug?: string;
};

export type TrackerDataPatchErrorJson = {
  error?: string;
};

/** Row shape returned by grid row APIs (includes server id). */
export type GridRowRecord = Record<string, unknown>;
