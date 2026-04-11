"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  initialSaveState,
  useTrackerNav,
} from "@/app/tracker/TrackerNavContext";

export type BoardNavPersistStatus = "idle" | "saving" | "saved" | "error";

type UseBoardNavBarOptions = {
  boardId: string;
  name: string;
  mode: "edit" | "view";
  /** When false, skips wiring (e.g. loading). */
  enabled: boolean;
  /** Edit mode: sync name from navbar. */
  onRename?: (name: string) => void | Promise<void>;
  /** Edit mode: autosave badge in navbar. */
  persistStatus?: BoardNavPersistStatus;
  persistError?: string | null;
};

export function useBoardNavBar({
  boardId,
  name,
  mode,
  enabled,
  onRename,
  persistStatus = "idle",
  persistError = null,
}: UseBoardNavBarOptions) {
  const nav = useTrackerNav();
  const setTrackerNav = nav?.setTrackerNav ?? null;
  const setSaveState = nav?.setSaveState ?? null;

  const onRenameRef = useRef(onRename);
  onRenameRef.current = onRename;

  const handleNameChange = useCallback(async (next: string) => {
    const fn = onRenameRef.current;
    if (fn) await fn(next);
  }, []);

  useEffect(() => {
    if (!enabled || !setTrackerNav) return;
    setTrackerNav({
      name: name.trim() || "Untitled dashboard",
      onNameChange: mode === "edit" ? handleNameChange : () => {},
    });
    return () => setTrackerNav(null);
  }, [enabled, setTrackerNav, name, mode, handleNameChange]);

  useEffect(() => {
    if (!enabled || !setSaveState) return;
    const isEdit = mode === "edit";
    const navDataStatus =
      persistStatus === "saving"
        ? "saving"
        : persistStatus === "saved"
          ? "saved"
          : persistStatus === "error"
            ? "error"
            : "idle";
    setSaveState({
      ...initialSaveState,
      primaryNavAction: {
        label: isEdit ? "Open dashboard" : "Edit layout",
        href: isEdit ? `/board/${boardId}` : `/board/${boardId}/edit`,
      },
      autosaveEnabled: isEdit,
      dataSaveStatus: isEdit ? navDataStatus : "idle",
      dataSaveError: isEdit ? persistError : null,
      titleEditable: isEdit,
    });
    return () => setSaveState({ ...initialSaveState });
  }, [
    enabled,
    setSaveState,
    boardId,
    mode,
    persistStatus,
    persistError,
  ]);
}
