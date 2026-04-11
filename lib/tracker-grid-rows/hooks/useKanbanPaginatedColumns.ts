"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGridRow,
  deleteTrackerDataRow,
  fetchGridRowsList,
  patchTrackerDataRow,
} from "../client";
import { KANBAN_GROUP_IDS_KEY_DELIMITER } from "../constants";
import { clampGridRowsLimit } from "../limits";
import type { GridRowRecord, RowBackedPersistLifecycle } from "../types";

export type KanbanColumnRow = GridRowRecord;

export interface ColumnState {
  rows: KanbanColumnRow[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

function emptyColumn(loading: boolean): ColumnState {
  return {
    rows: [],
    total: 0,
    loading,
    loadingMore: false,
    error: null,
  };
}

export interface UseKanbanPaginatedColumnsOptions {
  trackerId: string | null | undefined;
  gridSlug: string;
  branchName: string;
  groupFieldId: string;
  groupIds: string[];
  pageSize: number;
  enabled: boolean;
  persistLifecycle?: RowBackedPersistLifecycle | null;
}

export interface UseKanbanPaginatedColumnsResult {
  columns: Record<string, ColumnState>;
  loadMore: (groupId: string) => Promise<void>;
  refetchAll: () => void;
  moveCardLocally: (
    rowId: string,
    fromGroupId: string,
    toGroupId: string,
    patchedRow: KanbanColumnRow,
  ) => void;
  removeCardLocally: (groupId: string, rowId: string) => void;
  prependCardLocally: (groupId: string, row: KanbanColumnRow) => void;
  patchRowOnServer: (
    rowId: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  deleteRowOnServer: (rowId: string) => Promise<void>;
  createRowOnServer: (data: Record<string, unknown>) => Promise<KanbanColumnRow>;
}

type FirstPageResult = {
  groupValue: string;
  rows: KanbanColumnRow[];
  total: number;
  error: string | null;
};

export function useKanbanPaginatedColumns(
  options: UseKanbanPaginatedColumnsOptions,
): UseKanbanPaginatedColumnsResult {
  const {
    trackerId,
    gridSlug,
    branchName,
    groupFieldId,
    groupIds,
    pageSize,
    enabled,
    persistLifecycle,
  } = options;

  const persistRef = useRef(persistLifecycle);
  persistRef.current = persistLifecycle;

  const pageSizeClamped = clampGridRowsLimit(pageSize);

  const [columns, setColumns] = useState<Record<string, ColumnState>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const groupIdsRef = useRef(groupIds);
  groupIdsRef.current = groupIds;

  const groupIdsKey = groupIds.join(KANBAN_GROUP_IDS_KEY_DELIMITER);

  useEffect(() => {
    if (!enabled || !trackerId) {
      setColumns({});
      return;
    }

    const ids = groupIdsRef.current;
    const ac = new AbortController();

    const loadingState: Record<string, ColumnState> = {};
    for (const gid of ids) {
      loadingState[gid] = emptyColumn(true);
    }
    setColumns(loadingState);

    async function loadFirstPage() {
      const tid = trackerId as string;
      const results: FirstPageResult[] = await Promise.all(
        ids.map(async (groupValue): Promise<FirstPageResult> => {
          try {
            const result = await fetchGridRowsList(
              {
                trackerId: tid,
                gridSlug,
                branchName,
                limit: pageSizeClamped,
                offset: 0,
                groupFieldId,
                groupValue,
              },
              { signal: ac.signal },
            );
            if (!result.ok) {
              return {
                groupValue,
                rows: [],
                total: 0,
                error: result.errorMessage ?? "Load failed",
              };
            }
            return {
              groupValue,
              rows: result.rows,
              total: result.total,
              error: null,
            };
          } catch (e) {
            if (
              ac.signal.aborted ||
              (e instanceof Error && e.name === "AbortError")
            ) {
              return { groupValue, rows: [], total: 0, error: null };
            }
            return {
              groupValue,
              rows: [],
              total: 0,
              error: e instanceof Error ? e.message : "Load failed",
            };
          }
        }),
      );

      if (ac.signal.aborted) return;

      const byGroup = new Map(results.map((r) => [r.groupValue, r]));
      const next: Record<string, ColumnState> = {};
      for (const gid of ids) {
        const r = byGroup.get(gid);
        if (!r) {
          next[gid] = {
            ...emptyColumn(false),
            error: "Load failed",
          };
        } else if (r.error) {
          next[gid] = { ...emptyColumn(false), error: r.error };
        } else {
          next[gid] = {
            rows: r.rows,
            total: r.total,
            loading: false,
            loadingMore: false,
            error: null,
          };
        }
      }
      setColumns(next);
    }

    void loadFirstPage();
    return () => ac.abort();
  }, [
    enabled,
    trackerId,
    gridSlug,
    branchName,
    groupFieldId,
    pageSizeClamped,
    reloadKey,
    groupIdsKey,
  ]);

  const loadMore = useCallback(
    async (groupId: string) => {
      if (!trackerId) return;
      const tid = trackerId as string;

      const c = columnsRef.current[groupId];
      if (!c || c.loadingMore || c.loading || c.rows.length >= c.total) return;
      const offset = c.rows.length;

      setColumns((prev) => {
        const cur = prev[groupId];
        if (!cur || cur.loadingMore || cur.rows.length >= cur.total) return prev;
        return {
          ...prev,
          [groupId]: { ...cur, loadingMore: true },
        };
      });

      try {
        const result = await fetchGridRowsList({
          trackerId: tid,
          gridSlug,
          branchName,
          limit: pageSizeClamped,
          offset,
          groupFieldId,
          groupValue: groupId,
        });
        setColumns((prev) => {
          const col = prev[groupId];
          if (!col) return prev;
          if (!result.ok) {
            return { ...prev, [groupId]: { ...col, loadingMore: false } };
          }
          return {
            ...prev,
            [groupId]: {
              ...col,
              rows: [...col.rows, ...result.rows],
              total: result.total,
              loadingMore: false,
            },
          };
        });
      } catch {
        setColumns((prev) => {
          const col = prev[groupId];
          if (!col) return prev;
          return { ...prev, [groupId]: { ...col, loadingMore: false } };
        });
      }
    },
    [trackerId, gridSlug, branchName, groupFieldId, pageSizeClamped],
  );

  const refetchAll = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const moveCardLocally = useCallback(
    (
      rowId: string,
      fromGroupId: string,
      toGroupId: string,
      patchedRow: KanbanColumnRow,
    ) => {
      setColumns((prev) => {
        const from = prev[fromGroupId];
        const to = prev[toGroupId];
        if (!from || !to) return prev;
        const nextFromRows = from.rows.filter(
          (r) => String(r._rowId ?? "") !== rowId,
        );
        const nextToRows = [...to.rows, patchedRow];
        return {
          ...prev,
          [fromGroupId]: {
            ...from,
            rows: nextFromRows,
            total: Math.max(0, from.total - 1),
          },
          [toGroupId]: {
            ...to,
            rows: nextToRows,
            total: to.total + 1,
          },
        };
      });
    },
    [],
  );

  const removeCardLocally = useCallback((groupId: string, rowId: string) => {
    setColumns((prev) => {
      const c = prev[groupId];
      if (!c) return prev;
      return {
        ...prev,
        [groupId]: {
          ...c,
          rows: c.rows.filter((r) => String(r._rowId ?? "") !== rowId),
          total: Math.max(0, c.total - 1),
        },
      };
    });
  }, []);

  const prependCardLocally = useCallback((groupId: string, row: KanbanColumnRow) => {
    setColumns((prev) => {
      const c = prev[groupId];
      if (!c) return prev;
      return {
        ...prev,
        [groupId]: {
          ...c,
          rows: [row, ...c.rows],
          total: c.total + 1,
        },
      };
    });
  }, []);

  const patchRowOnServer = useCallback(
    async (rowId: string, data: Record<string, unknown>) => {
      if (!trackerId) throw new Error("Missing tracker id");
      persistRef.current?.onMutationStart?.();
      try {
        await patchTrackerDataRow(trackerId as string, rowId, data);
        persistRef.current?.onMutationSuccess?.();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to update row on server";
        persistRef.current?.onMutationError?.(msg);
        throw e;
      }
    },
    [trackerId],
  );

  const deleteRowOnServer = useCallback(
    async (rowId: string) => {
      if (!trackerId) throw new Error("Missing tracker id");
      persistRef.current?.onMutationStart?.();
      try {
        await deleteTrackerDataRow(trackerId as string, rowId);
        persistRef.current?.onMutationSuccess?.();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to delete row on server";
        persistRef.current?.onMutationError?.(msg);
        throw e;
      }
    },
    [trackerId],
  );

  const createRowOnServer = useCallback(
    async (data: Record<string, unknown>) => {
      if (!trackerId) throw new Error("Missing tracker id");
      persistRef.current?.onMutationStart?.();
      try {
        const row = await createGridRow(
          trackerId as string,
          gridSlug,
          branchName,
          data,
        );
        persistRef.current?.onMutationSuccess?.();
        return row;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to create row on server";
        persistRef.current?.onMutationError?.(msg);
        throw e;
      }
    },
    [trackerId, gridSlug, branchName],
  );

  return {
    columns,
    loadMore,
    refetchAll,
    moveCardLocally,
    removeCardLocally,
    prependCardLocally,
    patchRowOnServer,
    deleteRowOnServer,
    createRowOnServer,
  };
}
