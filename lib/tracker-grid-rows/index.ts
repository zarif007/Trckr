/**
 * Tracker grid row APIs — browser client, hooks, and helpers.
 * @see README.md in this folder for architecture and configuration.
 */

export { KANBAN_GROUP_IDS_KEY_DELIMITER } from "./constants";
export { gridRowsListPath, trackerDataRowPath } from "./api-paths";
export {
  GRID_ROWS_MAX_LIMIT,
  GRID_ROWS_MIN_LIMIT,
  clampGridRowsLimit,
  clampGridRowsOffset,
} from "./limits";
export type {
  GridRowRecord,
  GridRowsCreateResponseJson,
  GridRowsListResponseJson,
  TrackerDataPatchErrorJson,
  RowBackedPersistLifecycle,
} from "./types";
export { rowIdFromRow, rowPayloadForPatch } from "./row-utils";
export {
  fetchGridRowsList,
  createGridRow,
  patchTrackerDataRow,
  deleteTrackerDataRow,
} from "./client";
export type { FetchGridRowsListParams } from "./client";

export {
  usePaginatedGridData,
  type PaginatedGridRow,
  type UsePaginatedGridDataOptions,
  type UsePaginatedGridDataResult,
} from "./hooks/usePaginatedGridData";

export {
  useKanbanPaginatedColumns,
  type KanbanColumnRow,
  type ColumnState,
  type UseKanbanPaginatedColumnsOptions,
  type UseKanbanPaginatedColumnsResult,
} from "./hooks/useKanbanPaginatedColumns";

export { createOptimisticTempRowId } from "./optimistic-temp-row-id";
export {
  persistNewTrackerGridRow,
  persistEditedTrackerGridRow,
  persistNewKanbanCardViaRowApi,
  type PaginatedRowPersistenceApi,
  type KanbanCardPersistenceApi,
} from "./persistence";
