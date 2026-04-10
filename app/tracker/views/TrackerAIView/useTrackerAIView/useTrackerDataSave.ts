"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAutoSaveTrackerData } from "../../../hooks/useAutoSaveTrackerData";
import { useAutoSave } from "@/app/hooks/useAutoSave";
import type { TrackerFormAction } from "@/app/components/tracker-display/types";
import type { GridDataSnapshot } from "../../TrackerPanel";
import type { TrackerResponse } from "../../../hooks/useTrackerChat";
import type { BranchRecord } from "@/app/components/tracker-page/TrackerBranchPanel";
import type { LoadedSnapshot } from "../types";
import { DRAFT_STATUS_TAG } from "../types";
import { listPaginatedGridSlugs } from "@/lib/grid-data-loading";
import type { TrackerGrid } from "@/app/components/tracker-display/types";

function stripPaginatedGridKeysFromSnapshot(
  snapshot: GridDataSnapshot,
  grids: TrackerGrid[] | undefined,
): GridDataSnapshot {
  const slugs = listPaginatedGridSlugs(grids ?? []);
  if (slugs.length === 0) return snapshot;
  const next = { ...snapshot };
  for (const s of slugs) {
    delete next[s];
  }
  return next;
}

/** After a bulk save response, keep paginated grids empty in client state (rows load via row API). */
function normalizeSnapshotForPaginatedGrids(
  snapshot: GridDataSnapshot,
  grids: TrackerGrid[] | undefined,
): GridDataSnapshot {
  const slugs = listPaginatedGridSlugs(grids ?? []);
  if (slugs.length === 0) return snapshot;
  const next = { ...snapshot };
  for (const s of slugs) {
    next[s] = [];
  }
  return next;
}

export interface UseTrackerDataSaveParams {
  trackerId: string | null | undefined;
  trackerDataRef: React.RefObject<(() => GridDataSnapshot) | null>;
  versionControl: boolean;
  instanceType: "SINGLE" | "MULTI";
  instanceId: string | null | undefined;
  formStatusRef: React.MutableRefObject<string | null>;
  vcCurrentBranchRef: React.MutableRefObject<BranchRecord | null>;
  instanceIdRef: React.MutableRefObject<string | null>;
  setLoadedSnapshot: (s: LoadedSnapshot | null) => void;
  setVcBranches: React.Dispatch<React.SetStateAction<BranchRecord[]>>;
  setVcCurrentBranch: React.Dispatch<React.SetStateAction<BranchRecord | null>>;
  setCurrentFormStatus: (s: string | null) => void;
  setFormActionSaving: (v: boolean) => void;
  setFormActionError: (s: string | null) => void;
  allowAutoSave: boolean;
  allowSchemaAutoSave: boolean;
  schemaRef: React.MutableRefObject<TrackerResponse>;
  onSaveTracker?: (schema: TrackerResponse) => Promise<void>;
}

export function useTrackerDataSave(params: UseTrackerDataSaveParams) {
  const {
    trackerId,
    trackerDataRef,
    versionControl,
    instanceType,
    formStatusRef,
    vcCurrentBranchRef,
    instanceIdRef,
    setLoadedSnapshot,
    setVcBranches,
    setVcCurrentBranch,
    setCurrentFormStatus,
    setFormActionSaving,
    setFormActionError,
    allowAutoSave,
    allowSchemaAutoSave,
    schemaRef,
    onSaveTracker,
  } = params;

  const router = useRouter();
  const [dataSaveStatus, setDataSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [dataSaveError, setDataSaveError] = useState<string | null>(null);
  const [schemaSaveStatus, setSchemaSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [schemaSaveError, setSchemaSaveError] = useState<string | null>(null);
  const saveStatusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const setSavedWithTimeout = useCallback(() => {
    setDataSaveStatus("saved");
    setDataSaveError(null);
    if (saveStatusResetTimerRef.current)
      clearTimeout(saveStatusResetTimerRef.current);
    saveStatusResetTimerRef.current = setTimeout(() => {
      saveStatusResetTimerRef.current = null;
      setDataSaveStatus("idle");
    }, 1500);
  }, []);

  const setFormStatus = useCallback(
    (status: string | null) => {
      formStatusRef.current = status;
      setCurrentFormStatus(status);
    },
    [formStatusRef, setCurrentFormStatus],
  );

  const saveTrackerData = useCallback(
    async (
      options: {
        formStatus?: string | null;
        data?: GridDataSnapshot;
        /** When true, follow `orchestration.effects.redirect` after a successful save (explicit user actions only). */
        applyOrchestrationRedirect?: boolean;
      } = {},
    ) => {
      if (!trackerId) return;
      const rawData = options.data ?? trackerDataRef.current?.() ?? {};
      const grids = schemaRef.current?.grids as TrackerGrid[] | undefined;
      const data = stripPaginatedGridKeysFromSnapshot(rawData, grids);
      const nextFormStatus =
        options.formStatus !== undefined
          ? options.formStatus
          : formStatusRef.current;
      const payload: Record<string, unknown> = { data };
      if (nextFormStatus !== undefined) payload.formStatus = nextFormStatus;

      const handleResponse = async (res: Response) => {
        const saved = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof saved?.error === "string"
              ? saved.error
              : `Failed to save (${res.status})`;
          throw new Error(msg);
        }
        if (options.applyOrchestrationRedirect === true) {
          const red = (
            saved as {
              orchestration?: { effects?: { redirect?: { url?: string } } };
            }
          )?.orchestration?.effects?.redirect?.url;
          if (
            typeof red === "string" &&
            red.length > 0 &&
            typeof window !== "undefined"
          ) {
            window.location.assign(red);
          }
        }
        if (saved?.id && saved?.data) {
          const grids = schemaRef.current?.grids as TrackerGrid[] | undefined;
          const data = normalizeSnapshotForPaginatedGrids(
            saved.data as GridDataSnapshot,
            grids,
          );
          setLoadedSnapshot({
            id: saved.id,
            label: saved.label ?? null,
            data,
            updatedAt: saved.updatedAt,
            formStatus: saved.formStatus ?? null,
          });
        }
        return saved;
      };

      if (versionControl) {
        const currentBranch = vcCurrentBranchRef.current;
        if (currentBranch) {
          const res = await fetch(
            `/api/trackers/${trackerId}/branches/${currentBranch.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
          const updated = await handleResponse(res);
          if (updated?.id) {
            setVcBranches((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b)),
            );
            setVcCurrentBranch(updated);
          }
          return updated;
        }
        const res = await fetch(`/api/trackers/${trackerId}/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            branchName: "main",
            label: "main",
          }),
        });
        const created = await handleResponse(res);
        if (created?.id) {
          setVcBranches([created]);
          setVcCurrentBranch(created);
        }
        return created;
      }

      if (instanceType === "MULTI") {
        const currentId = instanceIdRef.current;
        if (currentId && currentId !== "new") {
          const res = await fetch(
            `/api/trackers/${trackerId}/data/${currentId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
          return handleResponse(res);
        }
        const res = await fetch(`/api/trackers/${trackerId}/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const saved = await handleResponse(res);
        if (saved?.id) {
          instanceIdRef.current = saved.id;
          router.replace(`/tracker/${trackerId}?instanceId=${saved.id}`, {
            scroll: false,
          });
        }
        return saved;
      }

      const res = await fetch(`/api/trackers/${trackerId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    [
      trackerId,
      trackerDataRef,
      versionControl,
      instanceType,
      router,
      vcCurrentBranchRef,
      instanceIdRef,
      setLoadedSnapshot,
      setVcBranches,
      setVcCurrentBranch,
      schemaRef,
    ],
  );

  const { scheduleSave } = useAutoSaveTrackerData({
    enabled: allowAutoSave,
    getData: () => trackerDataRef.current?.() ?? {},
    save: async (data) => {
      await saveTrackerData({ data });
    },
    debounceMs: 2000,
    idleMs: 2000,
    onStateChange: (state, error) => {
      if (state === "saving") {
        if (saveStatusResetTimerRef.current)
          clearTimeout(saveStatusResetTimerRef.current);
        saveStatusResetTimerRef.current = null;
        setDataSaveError(null);
        setDataSaveStatus("saving");
        return;
      }
      if (state === "idle") {
        setSavedWithTimeout();
        return;
      }
      if (state === "error") {
        if (saveStatusResetTimerRef.current)
          clearTimeout(saveStatusResetTimerRef.current);
        saveStatusResetTimerRef.current = null;
        setDataSaveStatus("error");
        setDataSaveError(error?.message ?? "Failed to auto-save");
      }
    },
  });

  const { scheduleSave: scheduleSchemaSave } = useAutoSave<TrackerResponse>({
    enabled: allowSchemaAutoSave,
    getData: () => schemaRef.current,
    save: async (nextSchema) => {
      if (!onSaveTracker) return;
      await onSaveTracker(nextSchema);
    },
    debounceMs: 1000,
    idleMs: 1500,
    onStateChange: (state, error) => {
      if (state === "saving") {
        if (saveStatusResetTimerRef.current)
          clearTimeout(saveStatusResetTimerRef.current);
        saveStatusResetTimerRef.current = null;
        setSchemaSaveError(null);
        setSchemaSaveStatus("saving");
        return;
      }
      if (state === "idle") {
        setSchemaSaveStatus("saved");
        setSchemaSaveError(null);
        if (saveStatusResetTimerRef.current)
          clearTimeout(saveStatusResetTimerRef.current);
        saveStatusResetTimerRef.current = setTimeout(() => {
          saveStatusResetTimerRef.current = null;
          setSchemaSaveStatus("idle");
        }, 1500);
        return;
      }
      if (state === "error") {
        if (saveStatusResetTimerRef.current)
          clearTimeout(saveStatusResetTimerRef.current);
        saveStatusResetTimerRef.current = null;
        setSchemaSaveStatus("error");
        setSchemaSaveError(error?.message ?? "Failed to auto-save tracker");
      }
    },
  });

  const handleGridDataChange = useCallback(() => {
    if (!allowAutoSave) return;
    const isDraft =
      (formStatusRef.current ?? "").trim().toLowerCase() ===
      DRAFT_STATUS_TAG.toLowerCase();
    if (!isDraft) setCurrentFormStatus(DRAFT_STATUS_TAG);
    scheduleSave();
  }, [allowAutoSave, scheduleSave, formStatusRef, setCurrentFormStatus]);

  const handleFormActionSelect = useCallback(
    async (action: TrackerFormAction) => {
      if (!trackerId) return;
      setFormActionSaving(true);
      setFormActionError(null);
      const prevStatus = formStatusRef.current;
      const persistOnly = action.persistOnly === true;
      if (!persistOnly) {
        setCurrentFormStatus(action.statusTag);
      }
      try {
        await saveTrackerData(
          persistOnly
            ? { applyOrchestrationRedirect: true }
            : {
                formStatus: action.statusTag,
                applyOrchestrationRedirect: true,
              },
        );
        toast(action.label, {
          description: persistOnly ? "Saved" : `Status: ${action.statusTag}`,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to update status";
        setFormActionError(msg);
        toast("Action failed", {
          description: msg,
          classNames: { toast: "border-destructive/40" },
        });
        if (!persistOnly) {
          setCurrentFormStatus(prevStatus ?? null);
        }
      } finally {
        setFormActionSaving(false);
      }
    },
    [
      saveTrackerData,
      formStatusRef,
      trackerId,
      setCurrentFormStatus,
      setFormActionSaving,
      setFormActionError,
    ],
  );

  useEffect(() => {
    return () => {
      if (saveStatusResetTimerRef.current)
        clearTimeout(saveStatusResetTimerRef.current);
    };
  }, []);

  return {
    saveTrackerData,
    scheduleSave,
    scheduleSchemaSave,
    dataSaveStatus,
    dataSaveError,
    schemaSaveStatus,
    schemaSaveError,
    setSavedWithTimeout,
    setFormStatus,
    handleGridDataChange,
    handleFormActionSelect,
  };
}
