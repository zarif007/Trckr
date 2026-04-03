"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Table2,
  Pencil,
  Trash2,
  LayoutList,
  Link2,
  ShieldCheck,
  FunctionSquare,
  GitBranch,
} from "lucide-react";

import { theme } from "@/lib/theme";

export type ContextMenuRowKind =
  | "file"
  | "module"
  | "tracker"
  | "project"
  | "report"
  | "analysis";

export type TrackerHrefs = {
  trackerPageHref: string;
  schemaEditHref: string;
  listHref: string | null;
  bindingsHref: string;
  validationsHref: string;
  calculationsHref: string;
  fieldRulesHref: string;
};

export type ContextMenuItem = {
  kind: ContextMenuRowKind;
  id: string;
  label: string;
  trackerHrefs?: TrackerHrefs;
};

export type RenamingState = {
  kind: ContextMenuRowKind;
  id: string;
  currentName: string;
} | null;

function getDeleteConfirmMessage(item: ContextMenuItem): string {
  switch (item.kind) {
    case "project":
      return `Delete project "${item.label}"? This will remove the project and all its modules and trackers.`;
    case "module":
      return `Delete module "${item.label}"? This will remove the module and all its trackers.`;
    case "tracker":
      return `Delete tracker "${item.label}"?`;
    case "report":
      return `Delete report "${item.label}"?`;
    case "analysis":
      return `Delete analysis "${item.label}"?`;
    default:
      return `Delete "${item.label}"?`;
  }
}

export type UseRenameDeleteContextMenuOptions = {
  onRename: (
    kind: ContextMenuItem["kind"],
    id: string,
    newName: string,
  ) => Promise<void>;
  onDelete: (item: ContextMenuItem) => Promise<void>;
  setError: (err: string | null) => void;
  /** Optional: apply optimistic UI update; return a revert function used on error. Receives previousName so revert logic does not depend on stale closure. */
  optimisticRename?: (
    kind: ContextMenuItem["kind"],
    id: string,
    newName: string,
    previousName: string,
  ) => (() => void) | void;
  /** Optional: apply optimistic UI update for delete; return a revert function used on error. */
  optimisticDelete?: (item: ContextMenuItem) => (() => void) | void;
};

export function useRenameDeleteContextMenu({
  onRename,
  onDelete,
  setError,
  optimisticRename,
  optimisticDelete,
}: UseRenameDeleteContextMenuOptions) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: ContextMenuItem;
  } | null>(null);
  const [renaming, setRenaming] = useState<RenamingState>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", close);
      window.addEventListener("scroll", close, true);
      return () => {
        window.removeEventListener("click", close);
        window.removeEventListener("scroll", close, true);
      };
    }
  }, [contextMenu]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openContextMenu = useCallback(
    (e: MouseEvent, item: ContextMenuItem) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    [],
  );

  const startRename = useCallback(
    (item: ContextMenuItem) => {
      closeContextMenu();
      setRenaming({
        kind: item.kind,
        id: item.id,
        currentName: item.label,
      });
    },
    [closeContextMenu],
  );

  const submitRename = useCallback(
    async (newName: string) => {
      const trim = newName.trim();
      if (!renaming || !trim) {
        setRenaming(null);
        return;
      }
      const { kind, id, currentName: previousName } = renaming;
      setError(null);
      // Apply optimistic update first (same order as project page: update UI then clear edit state)
      const revert = optimisticRename?.(kind, id, trim, previousName);
      setRenaming(null);
      try {
        await onRename(kind, id, trim);
      } catch (e) {
        revert?.();
        setRenaming({ kind, id, currentName: previousName });
        setError(e instanceof Error ? e.message : "Rename failed");
      }
    },
    [renaming, onRename, setError, optimisticRename],
  );

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitRename(e.currentTarget.value);
      }
      if (e.key === "Escape") {
        setRenaming(null);
      }
    },
    [submitRename],
  );

  const handleDelete = useCallback(
    async (item: ContextMenuItem) => {
      closeContextMenu();
      if (!window.confirm(getDeleteConfirmMessage(item))) return;
      setError(null);
      const revert = optimisticDelete?.(item);
      try {
        await onDelete(item);
      } catch (e) {
        revert?.();
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    },
    [closeContextMenu, onDelete, setError, optimisticDelete],
  );

  return {
    contextMenu,
    renaming,
    setRenaming,
    renameInputRef,
    openContextMenu,
    closeContextMenu,
    startRename,
    submitRename,
    handleRenameKeyDown,
    handleDelete,
  };
}

const menuLinkClass = theme.patterns.menuItem;
const menuBtnClass = theme.patterns.menuItem;
const sectionLabelClass =
  "px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground select-none";

export function RenameDeleteContextMenuPortal({
  contextMenu,
  onStartRename,
  onDelete,
}: {
  contextMenu: { x: number; y: number; item: ContextMenuItem } | null;
  onStartRename: (item: ContextMenuItem) => void;
  onDelete: (item: ContextMenuItem) => void;
}) {
  if (!contextMenu || typeof document === "undefined") return null;

  const { item } = contextMenu;
  const hrefs = item.trackerHrefs;

  const menu = (
    <div
      className={theme.patterns.menuPanel}
      style={{ left: contextMenu.x, top: contextMenu.y }}
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      {hrefs ? (
        <>
          <div className={sectionLabelClass}>Navigate</div>
          <Link
            href={hrefs.trackerPageHref}
            className={menuLinkClass}
            role="menuitem"
          >
            <Table2 className="h-3.5 w-3.5" />
            Open Tracker
          </Link>
          <Link
            href={hrefs.schemaEditHref}
            className={menuLinkClass}
            role="menuitem"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Schema
          </Link>
          {hrefs.listHref && (
            <Link
              href={hrefs.listHref}
              className={menuLinkClass}
              role="menuitem"
            >
              <LayoutList className="h-3.5 w-3.5" />
              View List
            </Link>
          )}

          <div className="my-1 mx-2 h-px bg-border/60" />
          <div className={sectionLabelClass}>Configure</div>
          <Link
            href={hrefs.bindingsHref}
            className={menuLinkClass}
            role="menuitem"
          >
            <Link2 className="h-3.5 w-3.5" />
            Bindings
          </Link>
          <Link
            href={hrefs.validationsHref}
            className={menuLinkClass}
            role="menuitem"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Validations
          </Link>
          <Link
            href={hrefs.calculationsHref}
            className={menuLinkClass}
            role="menuitem"
          >
            <FunctionSquare className="h-3.5 w-3.5" />
            Calculations
          </Link>
          <Link
            href={hrefs.fieldRulesHref}
            className={menuLinkClass}
            role="menuitem"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Field Rules
          </Link>

          <div className="my-1 mx-2 h-px bg-border/60" />
          <div className={sectionLabelClass}>Manage</div>
          <button
            type="button"
            role="menuitem"
            className={menuBtnClass}
            onClick={() => onStartRename(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${menuBtnClass} text-destructive`}
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            role="menuitem"
            className={menuBtnClass}
            onClick={() => onStartRename(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${menuBtnClass} text-destructive`}
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
