"use client";

/**
 * Composes **paginated Kanban** inputs for `useKanbanGroups`: resolved-option detection,
 * distinct-value HTTP loading, and flags passed as `distinctValuesFromServer` /
 * `distinctGroupValuesLoading`.
 *
 * Keeps `TrackerKanbanGrid` declarative; wiring rules live here for reuse in tests or other
 * surfaces that render the same board model.
 *
 * @see `lib/tracker-grid-rows/kanban-column-discovery/README.md`
 */

import { useMemo } from "react";
import type { TrackerContextForOptions } from "@/lib/binding";
import {
  fieldHasNonEmptyResolvedOptions,
  useDistinctGridFieldValues,
} from "@/lib/tracker-grid-rows";
import type {
  TrackerBindings,
  TrackerField,
  TrackerGrid,
  TrackerLayoutNode,
} from "../../types";
import {
  buildKanbanLayoutFields,
  resolveKanbanGroupByFieldId,
} from "./useKanbanGroups";

export interface UsePaginatedKanbanColumnSourcesParams {
  tabId: string;
  grid: TrackerGrid;
  layoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
  bindings: TrackerBindings;
  /** Same object passed to `useKanbanGroups` as `gridData` (includes this grid’s row slice). */
  gridDataForKanban: Record<string, Array<Record<string, unknown>>>;
  trackerContext?: TrackerContextForOptions | null;
  /** From `isGridDataPaginated(grid) && trackerId` — distinct fetch only when paginated. */
  gridIsPaginatedCapable: boolean;
  trackerId: string | null | undefined;
  branchName: string;
}

export interface UsePaginatedKanbanColumnSourcesResult {
  /** Pass through to `useKanbanGroups({ distinctValuesFromServer })`. */
  distinctValuesFromServer: string[];
  /** Pass through to `useKanbanGroups({ distinctGroupValuesLoading })`. */
  distinctGroupValuesLoading: boolean;
  /** Optional UI: distinct endpoint failed (columns fall back to row scan / Uncategorized). */
  columnDiscoveryError: string | null;
}

/**
 * Resolves whether the group-by field already supplies an option list; if not, loads distinct
 * values from the server whenever the grid is paginated-capable.
 */
export function usePaginatedKanbanColumnSources({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings,
  gridDataForKanban,
  trackerContext,
  gridIsPaginatedCapable,
  trackerId,
  branchName,
}: UsePaginatedKanbanColumnSourcesParams): UsePaginatedKanbanColumnSourcesResult {
  const kanbanLayoutFields = useMemo(
    () => buildKanbanLayoutFields(grid.id, layoutNodes, fields),
    [grid.id, layoutNodes, fields],
  );

  const resolvedGroupById = useMemo(
    () => resolveKanbanGroupByFieldId(grid, kanbanLayoutFields),
    [grid, kanbanLayoutFields],
  );

  const resolvedGroupingField = useMemo(
    () =>
      resolvedGroupById
        ? kanbanLayoutFields.find((f) => f.id === resolvedGroupById) ?? null
        : null,
    [kanbanLayoutFields, resolvedGroupById],
  );

  const groupByUsesResolvedOptions = useMemo(() => {
    if (!resolvedGroupingField) return false;
    return fieldHasNonEmptyResolvedOptions(
      tabId,
      grid.id,
      resolvedGroupingField,
      bindings,
      gridDataForKanban,
      trackerContext,
    );
  }, [
    tabId,
    grid.id,
    resolvedGroupingField,
    bindings,
    gridDataForKanban,
    trackerContext,
  ]);

  const { values, loading, error } = useDistinctGridFieldValues({
    enabled:
      gridIsPaginatedCapable &&
      Boolean(trackerId) &&
      Boolean(resolvedGroupById),
    trackerId,
    gridSlug: grid.id,
    branchName,
    fieldKey: resolvedGroupById,
    skip: groupByUsesResolvedOptions,
  });

  const distinctGroupValuesLoading =
    gridIsPaginatedCapable &&
    !groupByUsesResolvedOptions &&
    loading;

  return {
    distinctValuesFromServer: values,
    distinctGroupValuesLoading,
    columnDiscoveryError: error,
  };
}
