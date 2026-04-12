"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGridRow,
  deleteTrackerDataRow,
  fetchGridRowsList,
  patchTrackerDataRow,
} from "../client";
import { KANBAN_GROUP_IDS_KEY_DELIMITER } from "../constants";
import type { PatchTrackerDataRowBody } from "../row-accent-hex";
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
    body: PatchTrackerDataRowBody,
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

  const lastBaseIdentityRef = useRef("");

  useEffect(() => {
    if (!enabled || !trackerId) {
      lastBaseIdentityRef.current = "";
      setColumns({});
      return;
    }

    const requestedIds = groupIdsRef.current;
    const ac = new AbortController();

    const baseIdentity = `${reloadKey}|${trackerId}|${gridSlug}|${branchName}|${groupFieldId}|${pageSizeClamped}`;
    const baseChanged = lastBaseIdentityRef.current !== baseIdentity;
    lastBaseIdentityRef.current = baseIdentity;

    const prev = columnsRef.current;
    const occupiedLaneIds = Object.keys(prev).filter((k) => {
      const c = prev[k];
      return c && (c.rows.length > 0 || c.total > 0);
    });
    const ids = Array.from(new Set([...requestedIds, ...occupiedLaneIds]));
    const next: Record<string, ColumnState> = {};
    for (const gid of ids) {
      if (!baseChanged && prev[gid] !== undefined) {
        next[gid] = prev[gid]!;
      } else {
        next[gid] = emptyColumn(true);
      }
    }
    setColumns(next);

    async function loadFirstPage() {
      const tid = trackerId as string;
      const toFetch = ids.filter((gid) => {
        const c = next[gid];
        return c.loading && c.rows.length === 0;
      });
      if (toFetch.length === 0) return;

      const results: FirstPageResult[] = await Promise.all(
        toFetch.map(async (groupValue): Promise<FirstPageResult> => {
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

      setColumns((prevCols) => {
        const merged = { ...prevCols };
        for (const r of results) {
          if (r.error) {
            merged[r.groupValue] = { ...emptyColumn(false), error: r.error };
          } else {
            merged[r.groupValue] = {
              rows: r.rows,
              total: r.total,
              loading: false,
              loadingMore: false,
              error: null,
            };
          }
        }
        return merged;
      });
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
        if (!from) return prev;
        const nextFromRows = from.rows.filter(
          (r) => String(r._rowId ?? "") !== rowId,
        );
        const to = prev[toGroupId];
        if (!to) {
          return {
            ...prev,
            [fromGroupId]: {
              ...from,
              rows: nextFromRows,
              total: Math.max(0, from.total - 1),
            },
            [toGroupId]: {
              rows: [patchedRow],
              total: 1,
              loading: false,
              loadingMore: false,
              error: null,
            },
          };
        }
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
      if (!c) {
        return {
          ...prev,
          [groupId]: {
            rows: [row],
            total: 1,
            loading: false,
            loadingMore: false,
            error: null,
          },
        };
      }
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
    async (rowId: string, body: PatchTrackerDataRowBody) => {
      if (!trackerId) throw new Error("Missing tracker id");
      persistRef.current?.onMutationStart?.();
      try {
        await patchTrackerDataRow(trackerId as string, rowId, body);
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
