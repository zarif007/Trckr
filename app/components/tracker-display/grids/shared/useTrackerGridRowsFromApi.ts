"use client";

import { useMemo } from "react";
import type { TrackerGrid } from "../../types";
import { useTrackerDataApi } from "../../tracker-data-api-context";
import { useEditMode } from "../../edit-mode";
import {
  isGridDataPaginated,
  effectivePaginatedPageSize,
} from "@/lib/grid-data-loading";
import { usePaginatedGridData } from "@/lib/tracker-grid-rows";

const EMPTY_ROWS: Array<Record<string, unknown>> = [];

export interface UseTrackerGridRowsFromApiParams {
  grid: TrackerGrid;
  gridData: Record<string, Array<Record<string, unknown>>>;
  gridDataForThisGrid?: Array<Record<string, unknown>>;
}

export interface UseTrackerGridRowsFromApiResult {
  rows: Array<Record<string, unknown>>;
  fullGridData: Record<string, Array<Record<string, unknown>>>;
  gridIsPaginatedCapable: boolean;
  paginatedDisplay: boolean;
  mutateRowsViaRowApi: boolean;
  pg: ReturnType<typeof usePaginatedGridData>;
}

/**
 * Resolves visible rows and merged grid data for a grid, matching {@link TrackerTableGrid}:
 * snapshot rows from props, or paginated rows from the row API when the grid is paginated-capable.
 */
export function useTrackerGridRowsFromApi({
  grid,
  gridData,
  gridDataForThisGrid,
}: UseTrackerGridRowsFromApiParams): UseTrackerGridRowsFromApiResult {
  const thisGridRows = useMemo(
    () => gridDataForThisGrid ?? gridData[grid.id] ?? EMPTY_ROWS,
    [gridDataForThisGrid, gridData, grid.id],
  );

  const {
    trackerSchemaId: dataApiTrackerId,
    gridDataBranchName,
    rowBackedPersistLifecycle,
  } = useTrackerDataApi();
  const { editMode, schema, onSchemaChange } = useEditMode();
  const canEditLayout = editMode && !!schema && !!onSchemaChange;

  const gridIsPaginatedCapable =
    isGridDataPaginated(grid) && Boolean(dataApiTrackerId ?? undefined);
  /** True when not in layout edit — controls server pagination UI (e.g. table pager). */
  const paginatedDisplay = gridIsPaginatedCapable && !canEditLayout;
  /** Row HTTP API whenever the grid is paginated-capable (edit preview uses the same rows as main). */
  const mutateRowsViaRowApi = gridIsPaginatedCapable;

  const pSize = effectivePaginatedPageSize(grid);
  const pg = usePaginatedGridData({
    trackerId: dataApiTrackerId,
    gridSlug: grid.id,
    branchName: gridDataBranchName,
    initialPageSize: pSize,
    enabled: gridIsPaginatedCapable,
    persistLifecycle: rowBackedPersistLifecycle ?? undefined,
  });

  const rows = useMemo((): Array<Record<string, unknown>> => {
    if (!isGridDataPaginated(grid)) return thisGridRows;
    return pg.rows as Array<Record<string, unknown>>;
  }, [grid, thisGridRows, pg.rows]);

  const fullGridData = useMemo(
    () => ({ ...gridData, [grid.id]: rows }),
    [gridData, grid.id, rows],
  );

  return {
    rows,
    fullGridData,
    gridIsPaginatedCapable,
    paginatedDisplay,
    mutateRowsViaRowApi,
    pg,
  };
}
