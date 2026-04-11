"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGridRow,
  deleteTrackerDataRow,
  fetchGridRowsList,
  patchTrackerDataRow,
} from "../client";
import { clampGridRowsLimit } from "../limits";
import { rowIdFromRow } from "../row-utils";
import type { GridRowRecord, RowBackedPersistLifecycle } from "../types";

export type PaginatedGridRow = GridRowRecord;

export interface UsePaginatedGridDataOptions {
  trackerId: string | null | undefined;
  gridSlug: string;
  branchName: string;
  initialPageSize: number;
  enabled: boolean;
  /** Optional: drive data-mode autosave badge when rows persist via row HTTP API. */
  persistLifecycle?: RowBackedPersistLifecycle | null;
}

export interface UsePaginatedGridDataResult {
  rows: PaginatedGridRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
  setPageIndex: (n: number) => void;
  setPageSize: (n: number) => void;
  refetch: () => void;
  updateRowLocal: (
    rowId: string,
    updater: (prev: PaginatedGridRow) => PaginatedGridRow,
  ) => void;
  removeRowsLocal: (rowIds: string[]) => void;
  prependRowLocal: (row: PaginatedGridRow) => void;
  patchRowOnServer: (
    rowId: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  deleteRowsOnServer: (rowIds: string[]) => Promise<void>;
  createRowOnServer: (data: Record<string, unknown>) => Promise<PaginatedGridRow>;
}

const MAX_GRID_MISSING_RETRIES = 20;
const GRID_MISSING_RETRY_MS = 1600;

function isTransientGridNotFound(status: number, message: string | null): boolean {
  if (status !== 404 || message == null) return false;
  return (
    message === "Grid not found" || message.includes("Grid not found")
  );
}

export function usePaginatedGridData(
  options: UsePaginatedGridDataOptions,
): UsePaginatedGridDataResult {
  const {
    trackerId,
    gridSlug,
    branchName,
    initialPageSize,
    enabled,
    persistLifecycle,
  } = options;

  const persistRef = useRef(persistLifecycle);
  persistRef.current = persistLifecycle;

  const [rows, setRows] = useState<PaginatedGridRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState(() =>
    clampGridRowsLimit(initialPageSize),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const gridMissingRetryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPageSize = useCallback((n: number) => {
    setPageSizeState(clampGridRowsLimit(n));
    setPageIndex(0);
  }, []);

  const refetch = useCallback(() => {
    gridMissingRetryRef.current = 0;
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    setPageSizeState(clampGridRowsLimit(initialPageSize));
  }, [initialPageSize]);

  useEffect(() => {
    gridMissingRetryRef.current = 0;
  }, [enabled, trackerId, gridSlug, branchName, pageIndex, pageSize]);

  useEffect(() => {
    if (!enabled || !trackerId) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const offset = pageIndex * pageSize;
        const tid = trackerId as string;
        const result = await fetchGridRowsList(
          {
            trackerId: tid,
            gridSlug,
            branchName,
            limit: pageSize,
            offset,
          },
          { signal: ac.signal },
        );
        if (cancelled) return;
        if (!result.ok) {
          const msg = result.errorMessage ?? null;
          if (
            isTransientGridNotFound(result.status, msg) &&
            gridMissingRetryRef.current < MAX_GRID_MISSING_RETRIES
          ) {
            gridMissingRetryRef.current += 1;
            setRows([]);
            setTotal(0);
            setError(null);
            if (retryTimerRef.current != null) {
              clearTimeout(retryTimerRef.current);
            }
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              if (!cancelled) setReloadToken((t) => t + 1);
            }, GRID_MISSING_RETRY_MS);
            return;
          }
          if (isTransientGridNotFound(result.status, msg)) {
            setError(
              "Grid not found on server — save the tracker schema or refresh the page.",
            );
            return;
          }
          setError(result.errorMessage ?? "Failed to load rows");
          return;
        }
        gridMissingRetryRef.current = 0;
        setRows(result.rows);
        setTotal(result.total);
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load rows");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
      ac.abort();
      if (retryTimerRef.current != null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [
    enabled,
    trackerId,
    gridSlug,
    branchName,
    pageIndex,
    pageSize,
    reloadToken,
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);

  const updateRowLocal = useCallback(
    (rowId: string, updater: (prev: PaginatedGridRow) => PaginatedGridRow) => {
      setRows((prev) =>
        prev.map((r) => (rowIdFromRow(r) === rowId ? updater(r) : r)),
      );
    },
    [],
  );

  const removeRowsLocal = useCallback((rowIds: string[]) => {
    const set = new Set(rowIds);
    setRows((prev) =>
      prev.filter((r) => {
        const id = rowIdFromRow(r);
        return !id || !set.has(id);
      }),
    );
    setTotal((t) => Math.max(0, t - rowIds.length));
  }, []);

  const prependRowLocal = useCallback((row: PaginatedGridRow) => {
    setRows((prev) => [row, ...prev]);
    setTotal((t) => t + 1);
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

  const deleteRowsOnServer = useCallback(
    async (rowIds: string[]) => {
      if (!trackerId) throw new Error("Missing tracker id");
      const tid = trackerId as string;
      persistRef.current?.onMutationStart?.();
      try {
        await Promise.all(rowIds.map((id) => deleteTrackerDataRow(tid, id)));
        persistRef.current?.onMutationSuccess?.();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to delete rows on server";
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
    rows,
    total,
    pageIndex,
    pageSize,
    pageCount,
    loading,
    error,
    setPageIndex,
    setPageSize,
    refetch,
    updateRowLocal,
    removeRowsLocal,
    prependRowLocal,
    patchRowOnServer,
    deleteRowsOnServer,
    createRowOnServer,
  };
}
