/**
 * Tracker grid row APIs — browser client, hooks, and helpers.
 *
 * **Kanban column discovery** (pure merge + distinct fetch) lives in
 * {@link ./kanban-column-discovery} and is re-exported from this package root.
 *
 * @see README.md in this folder for architecture and configuration.
 */

export { KANBAN_GROUP_IDS_KEY_DELIMITER } from "./constants";
export {
  gridRowsListPath,
  gridDistinctFieldValuesPath,
  trackerDataRowPath,
} from "./api-paths";
export {
  GRID_ROWS_MAX_LIMIT,
  GRID_ROWS_MIN_LIMIT,
  clampGridRowsLimit,
  clampGridRowsOffset,
} from "./limits";
export type {
  GridRowRecord,
  GridDistinctFieldValuesResponseJson,
  GridRowsCreateResponseJson,
  GridRowsListResponseJson,
  TrackerDataPatchErrorJson,
  RowBackedPersistLifecycle,
} from "./types";
export { rowIdFromRow, rowPayloadForPatch } from "./row-utils";
export {
  ROW_ACCENT_HEX_CLIENT_KEY,
  buildPatchTrackerRowRequestBody,
  rowAccentStyleFromRow,
  parseRowAccentHex,
  rowAccentHexBodySchema,
  type PatchTrackerDataRowBody,
  type RowAccentVisualKind,
} from "./row-accent-hex";
export {
  fetchGridRowsList,
  fetchGridDistinctFieldValues,
  createGridRow,
  patchTrackerDataRow,
  deleteTrackerDataRow,
} from "./client";
export type {
  FetchGridRowsListParams,
  FetchGridDistinctFieldValuesParams,
} from "./client";

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

export {
  useDistinctGridFieldValues,
  type UseDistinctGridFieldValuesParams,
} from "./hooks/useDistinctGridFieldValues";

export {
  buildKanbanGroupColumnDescriptors,
  fieldHasNonEmptyResolvedOptions,
  type BuildKanbanGroupColumnDescriptorsInput,
  type BuildKanbanGroupColumnDescriptorsResult,
  type KanbanGroupColumnDescriptor,
  type FieldForKanbanOptionResolution,
  type ResolvedOptionLike,
} from "./kanban-column-discovery";

export { createOptimisticTempRowId } from "./optimistic-temp-row-id";
export {
  persistNewTrackerGridRow,
  persistEditedTrackerGridRow,
  persistNewKanbanCardViaRowApi,
  type PaginatedRowPersistenceApi,
  type KanbanCardPersistenceApi,
} from "./persistence";
