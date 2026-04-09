"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createGridRow,
  deleteTrackerDataRow,
  fetchGridRowsList,
  patchTrackerDataRow,
} from "../client";
import { clampGridRowsLimit } from "../limits";
import { rowIdFromRow } from "../row-utils";
import type { GridRowRecord } from "../types";

export type PaginatedGridRow = GridRowRecord;

export interface UsePaginatedGridDataOptions {
  trackerId: string | null | undefined;
  gridSlug: string;
  branchName: string;
  initialPageSize: number;
  enabled: boolean;
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

export function usePaginatedGridData(
  options: UsePaginatedGridDataOptions,
): UsePaginatedGridDataResult {
  const {
    trackerId,
    gridSlug,
    branchName,
    initialPageSize,
    enabled,
  } = options;

  const [rows, setRows] = useState<PaginatedGridRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState(() =>
    clampGridRowsLimit(initialPageSize),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const setPageSize = useCallback((n: number) => {
    setPageSizeState(clampGridRowsLimit(n));
    setPageIndex(0);
  }, []);

  const refetch = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    setPageSizeState(clampGridRowsLimit(initialPageSize));
  }, [initialPageSize]);

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
          setError(result.errorMessage ?? "Failed to load rows");
          return;
        }
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
      await patchTrackerDataRow(trackerId as string, rowId, data);
    },
    [trackerId],
  );

  const deleteRowsOnServer = useCallback(
    async (rowIds: string[]) => {
      if (!trackerId) throw new Error("Missing tracker id");
      const tid = trackerId as string;
      await Promise.all(rowIds.map((id) => deleteTrackerDataRow(tid, id)));
    },
    [trackerId],
  );

  const createRowOnServer = useCallback(
    async (data: Record<string, unknown>) => {
      if (!trackerId) throw new Error("Missing tracker id");
      return createGridRow(trackerId as string, gridSlug, branchName, data);
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
