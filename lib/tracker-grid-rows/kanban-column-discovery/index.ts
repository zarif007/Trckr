/**
 * @packageDocumentation
 * Kanban column discovery — **pure column list builders** plus small helpers used when
 * a paginated grid has no row snapshot to scan. Consumers: `useKanbanGroups`, row API.
 *
 * @see ./README.md
 */

export type {
  KanbanGroupColumnDescriptor,
  ResolvedOptionLike,
} from "./types";

export {
  buildKanbanGroupColumnDescriptors,
  type BuildKanbanGroupColumnDescriptorsInput,
  type BuildKanbanGroupColumnDescriptorsResult,
} from "./merge-group-columns";

export {
  fieldHasNonEmptyResolvedOptions,
  type FieldForKanbanOptionResolution,
} from "./resolved-select-options";
