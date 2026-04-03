"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForeignBindingSourceSchema } from "@/lib/dynamic-options";
import { FOREIGN_BINDING_SAVE_DEBOUNCE_MS } from "./constants";
import {
  fetchLatestDataRow,
  loadForeignBindingSource,
  persistForeignBindingSnapshot,
} from "./tracker-api";
import { appendRowId, isNumericRowId } from "@/lib/tracker-data";
import type { ForeignDataPersistMeta, GridDataSnapshot } from "./types";

function ensureRowId(
  row: Record<string, unknown>,
  siblingRows: Array<Record<string, unknown>>,
): Record<string, unknown> {
  if (isNumericRowId(row.row_id)) return row;
  return { ...row, row_id: appendRowId(siblingRows) };
}

export type ForeignPersistError = {
  sourceSchemaId: string;
  message: string;
};

export type ForeignBindingSourcesForOptionsContext = {
  foreignGridDataBySchemaId: Record<string, GridDataSnapshot> | null;
  foreignSchemaBySchemaId: Record<string, ForeignBindingSourceSchema> | null;
  onAddEntryToForeignGrid: (
    sourceSchemaId: string,
    gridId: string,
    row: Record<string, unknown>,
  ) => void;
  /** True while initial GETs for foreign trackers are in flight. */
  foreignSourcesLoading: boolean;
  /** True while a debounced save or follow-up save is running for any foreign source. */
  foreignSourcesSaving: boolean;
  /** Last failed persist (cleared on success or dismiss). */
  foreignPersistError: ForeignPersistError | null;
  dismissForeignPersistError: () => void;
};

/**
 * Loads grid data + schema slices for other trackers referenced by bindings (`optionsSourceSchemaId`),
 * and persists “add option” rows back to the source tracker’s TrackerData.
 *
 * Saves are **debounced** per source so several quick adds become one API call. If the user adds a row
 * while a save is still running, a **follow-up save** runs automatically so we never persist a stale snapshot.
 */
export function useForeignBindingSources(
  bindingSourceSchemaIds: string[],
): ForeignBindingSourcesForOptionsContext {
  const [foreignGridDataBySchemaId, setForeignGridDataBySchemaId] = useState<
    Record<string, GridDataSnapshot>
  >({});
  const [foreignSchemaBySchemaId, setForeignSchemaBySchemaId] = useState<
    Record<string, ForeignBindingSourceSchema>
  >({});
  const [foreignPersistMetaBySchemaId, setForeignPersistMetaBySchemaId] =
    useState<Record<string, ForeignDataPersistMeta>>({});
  const [foreignSourcesLoading, setForeignSourcesLoading] = useState(false);
  const [foreignSourcesSavingCount, setForeignSourcesSavingCount] = useState(0);
  const [foreignPersistError, setForeignPersistError] =
    useState<ForeignPersistError | null>(null);

  const foreignGridDataRef = useRef(foreignGridDataBySchemaId);
  const foreignPersistMetaRef = useRef(foreignPersistMetaBySchemaId);
  const bindingSourceIdsRef = useRef(bindingSourceSchemaIds);

  const debounceTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const saveInFlightRef = useRef<Record<string, boolean>>({});
  const needFollowUpSaveRef = useRef<Record<string, boolean>>({});
  const dirtyForeignRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    foreignGridDataRef.current = foreignGridDataBySchemaId;
  }, [foreignGridDataBySchemaId]);
  useEffect(() => {
    foreignPersistMetaRef.current = foreignPersistMetaBySchemaId;
  }, [foreignPersistMetaBySchemaId]);
  bindingSourceIdsRef.current = bindingSourceSchemaIds;

  const beginSave = useCallback(() => {
    setForeignSourcesSavingCount((c) => c + 1);
  }, []);
  const endSave = useCallback(() => {
    setForeignSourcesSavingCount((c) => Math.max(0, c - 1));
  }, []);

  const bindingSourceIdsKey = useMemo(
    () => bindingSourceSchemaIds.join("\0"),
    [bindingSourceSchemaIds],
  );

  const clearDebounce = useCallback((sourceSchemaId: string) => {
    const t = debounceTimersRef.current[sourceSchemaId];
    if (t) {
      clearTimeout(t);
      delete debounceTimersRef.current[sourceSchemaId];
    }
  }, []);

  const refetchForeignGridData = useCallback(async (sourceSchemaId: string) => {
    const row = await fetchLatestDataRow(sourceSchemaId);
    if (!row) return;
    setForeignGridDataBySchemaId((prev) => ({
      ...prev,
      [sourceSchemaId]: row.gridData,
    }));
    setForeignPersistMetaBySchemaId((prev) => {
      const cur = prev[sourceSchemaId];
      if (!cur) return prev;
      return {
        ...prev,
        [sourceSchemaId]: {
          ...cur,
          dataSnapshotId:
            typeof row.dataSnapshotId === "string"
              ? row.dataSnapshotId
              : cur.dataSnapshotId,
          formStatus: row.formStatus ?? cur.formStatus,
        },
      };
    });
    dirtyForeignRef.current[sourceSchemaId] = false;
  }, []);

  const applyPersistSuccess = useCallback(
    (
      sourceSchemaId: string,
      result: {
        serverData?: GridDataSnapshot;
        newSnapshotId?: string;
        nextWriteMode?: ForeignDataPersistMeta["writeMode"];
      },
    ) => {
      setForeignPersistError(null);
      if (result.serverData) {
        setForeignGridDataBySchemaId((prev) => {
          const next = { ...prev, [sourceSchemaId]: result.serverData! };
          foreignGridDataRef.current = next;
          return next;
        });
      }
      if (result.newSnapshotId) {
        setForeignPersistMetaBySchemaId((prev) => {
          const cur = prev[sourceSchemaId];
          if (!cur) return prev;
          return {
            ...prev,
            [sourceSchemaId]: {
              ...cur,
              dataSnapshotId: result.newSnapshotId!,
              writeMode: result.nextWriteMode ?? cur.writeMode,
            },
          };
        });
      }
    },
    [],
  );

  /**
   * Runs one or more saves until the snapshot is stable (handles adds during an in-flight request).
   */
  const flushPersistForSource = useCallback(
    async (sourceSchemaId: string) => {
      clearDebounce(sourceSchemaId);

      for (;;) {
        if (saveInFlightRef.current[sourceSchemaId]) {
          needFollowUpSaveRef.current[sourceSchemaId] = true;
          return;
        }

        const meta = foreignPersistMetaRef.current[sourceSchemaId];
        const snapshot = foreignGridDataRef.current[sourceSchemaId];
        if (!meta?.hydrated || snapshot === undefined) return;
        if (!dirtyForeignRef.current[sourceSchemaId]) return;

        saveInFlightRef.current[sourceSchemaId] = true;
        let followUp = false;
        beginSave();
        try {
          const result = await persistForeignBindingSnapshot({
            sourceSchemaId,
            meta,
            snapshot,
          });
          if (result.kind === "saved") {
            applyPersistSuccess(sourceSchemaId, result);
          } else {
            setForeignPersistError({
              sourceSchemaId,
              message: result.message,
            });
            console.error(
              "Failed to persist options on source tracker",
              sourceSchemaId,
              result.message,
            );
            await refetchForeignGridData(sourceSchemaId);
            return;
          }
        } finally {
          endSave();
          saveInFlightRef.current[sourceSchemaId] = false;
          followUp = needFollowUpSaveRef.current[sourceSchemaId];
          if (followUp) {
            needFollowUpSaveRef.current[sourceSchemaId] = false;
          }
          if (!followUp) {
            dirtyForeignRef.current[sourceSchemaId] = false;
          }
        }

        if (!followUp) break;
      }
    },
    [
      applyPersistSuccess,
      beginSave,
      clearDebounce,
      endSave,
      refetchForeignGridData,
    ],
  );

  const scheduleDebouncedPersist = useCallback(
    (sourceSchemaId: string) => {
      if (saveInFlightRef.current[sourceSchemaId]) {
        needFollowUpSaveRef.current[sourceSchemaId] = true;
        return;
      }
      clearDebounce(sourceSchemaId);
      debounceTimersRef.current[sourceSchemaId] = setTimeout(() => {
        delete debounceTimersRef.current[sourceSchemaId];
        void flushPersistForSource(sourceSchemaId);
      }, FOREIGN_BINDING_SAVE_DEBOUNCE_MS);
    },
    [clearDebounce, flushPersistForSource],
  );

  const dismissForeignPersistError = useCallback(() => {
    setForeignPersistError(null);
  }, []);

  useEffect(() => {
    const ids =
      bindingSourceIdsKey === "" ? [] : bindingSourceIdsKey.split("\0");
    let cancelled = false;

    if (ids.length === 0) {
      for (const id of Object.keys(debounceTimersRef.current)) {
        clearDebounce(id);
      }
      debounceTimersRef.current = {};
      saveInFlightRef.current = {};
      needFollowUpSaveRef.current = {};
      dirtyForeignRef.current = {};
      setForeignGridDataBySchemaId({});
      setForeignSchemaBySchemaId({});
      setForeignPersistMetaBySchemaId({});
      setForeignSourcesLoading(false);
      setForeignPersistError(null);
      return;
    }

    setForeignSourcesLoading(true);
    (async () => {
      const bundles = await Promise.all(
        ids.map((id) => loadForeignBindingSource(id)),
      );
      if (cancelled) {
        setForeignSourcesLoading(false);
        return;
      }

      const nextData: Record<string, GridDataSnapshot> = {};
      const nextSchema: Record<string, ForeignBindingSourceSchema> = {};
      const nextPersist: Record<string, ForeignDataPersistMeta> = {};

      ids.forEach((id, index) => {
        const bundle = bundles[index];
        if (!bundle) return;
        nextData[id] = bundle.gridData;
        if (bundle.schemaSlice) nextSchema[id] = bundle.schemaSlice;
        nextPersist[id] = bundle.persist;
      });

      setForeignGridDataBySchemaId(nextData);
      setForeignSchemaBySchemaId(nextSchema);
      setForeignPersistMetaBySchemaId(nextPersist);
      setForeignSourcesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [bindingSourceIdsKey, clearDebounce]);

  /** Best-effort flush when the host unmounts (e.g. user navigates away). */
  useEffect(() => {
    return () => {
      for (const id of Object.keys(debounceTimersRef.current)) {
        clearDebounce(id);
      }
      const ids = bindingSourceIdsRef.current;
      for (const sourceSchemaId of ids) {
        if (!dirtyForeignRef.current[sourceSchemaId]) continue;
        const meta = foreignPersistMetaRef.current[sourceSchemaId];
        const snapshot = foreignGridDataRef.current[sourceSchemaId];
        if (!meta?.hydrated || snapshot === undefined) continue;
        void persistForeignBindingSnapshot({
          sourceSchemaId,
          meta,
          snapshot,
        });
      }
    };
  }, [clearDebounce]);

  const onAddEntryToForeignGrid = useCallback(
    (sourceSchemaId: string, gridId: string, row: Record<string, unknown>) => {
      dirtyForeignRef.current[sourceSchemaId] = true;
      setForeignGridDataBySchemaId((prev) => {
        const doc = prev[sourceSchemaId] ?? {};
        const rows = [...(doc[gridId] ?? [])];
        const rowWithId = ensureRowId(row, rows);
        rows.push(rowWithId);
        const nextDoc = { ...doc, [gridId]: rows };
        const next = { ...prev, [sourceSchemaId]: nextDoc };
        foreignGridDataRef.current = next;
        scheduleDebouncedPersist(sourceSchemaId);
        return next;
      });
    },
    [scheduleDebouncedPersist],
  );

  const hasGridData = Object.keys(foreignGridDataBySchemaId).length > 0;
  const hasSchema = Object.keys(foreignSchemaBySchemaId).length > 0;

  return {
    foreignGridDataBySchemaId: hasGridData ? foreignGridDataBySchemaId : null,
    foreignSchemaBySchemaId: hasSchema ? foreignSchemaBySchemaId : null,
    onAddEntryToForeignGrid,
    foreignSourcesLoading,
    foreignSourcesSaving: foreignSourcesSavingCount > 0,
    foreignPersistError,
    dismissForeignPersistError,
  };
}
