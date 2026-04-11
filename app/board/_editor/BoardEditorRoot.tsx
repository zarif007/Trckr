"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BOARD_DEFINITION_VERSION,
  fetchTrackerAssembledSchema,
  getNextPlaceId,
  buildDefaultStatElement,
  buildDefaultTableElement,
  buildDefaultChartElement,
  buildDefaultTextElement,
  type AssembledSchema,
  type BoardDefinition,
  type BoardElement,
  useUndoableBoardDefinition,
} from "@/lib/boards";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import type { TrackerSchema } from "@/app/dashboard/dashboard-context";
import {
  useBoardNavBar,
  type BoardNavPersistStatus,
} from "@/app/board/_hooks/useBoardNavBar";
import { BoardBlockEditor } from "./BoardBlockEditor";
import { BoardEditorPanel } from "./BoardEditorPanel";

type BoardMeta = {
  id: string;
  name: string;
  projectId: string;
  moduleId: string | null;
  definition: BoardDefinition;
  projectName: string | null;
  moduleName: string | null;
};

function trackersInScope(
  trackers: TrackerSchema[],
  moduleId: string | null,
): TrackerSchema[] {
  return trackers.filter(
    (t) =>
      t.type === "GENERAL" &&
      (moduleId == null ? t.moduleId == null : t.moduleId === moduleId),
  );
}

export function BoardEditClient({ boardId }: { boardId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";

  const [board, setBoard] = useState<BoardMeta | null>(null);
  const {
    definition,
    mutateDefinition,
    undo,
    canUndo,
    replaceDefinition,
  } = useUndoableBoardDefinition({ maxUndo: 50 });
  const [data, setData] = useState<Record<string, BoardElementPayload> | null>(
    null,
  );
  const [projectTrackers, setProjectTrackers] = useState<TrackerSchema[]>([]);
  const [schemaByTracker, setSchemaByTracker] = useState<
    Record<string, AssembledSchema | null>
  >({});
  const schemaFetchStarted = useRef(new Set<string>());
  const [editMode, setEditMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [persistStatus, setPersistStatus] =
    useState<BoardNavPersistStatus>("idle");
  const persistOk = useRef(false);
  const saveGeneration = useRef(0);
  const [addingWidget, setAddingWidget] = useState<
    null | "stat" | "table" | "chart"
  >(null);

  const loadSchema = useCallback((trackerId: string) => {
    if (schemaFetchStarted.current.has(trackerId)) return;
    schemaFetchStarted.current.add(trackerId);
    void fetchTrackerAssembledSchema(trackerId).then((s) => {
      setSchemaByTracker((prev) => ({ ...prev, [trackerId]: s }));
    });
  }, []);

  const prefetchSchemasForDefinition = useCallback(
    (def: BoardDefinition) => {
      const ids = new Set(
        def.elements
          .filter((e) => e.type !== "text")
          .map((e) => (e as Exclude<BoardElement, { type: "text" }>).source.trackerSchemaId)
      );
      ids.forEach((id) => loadSchema(id));
    },
    [loadSchema],
  );

  useEffect(() => {
    if (!editMode) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const target = e.target as HTMLElement | null;
        if (target?.closest("input, textarea, [contenteditable=true]")) {
          return;
        }
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, undo]);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    persistOk.current = false;
    schemaFetchStarted.current.clear();
    setSchemaByTracker({});
    try {
      const bRes = await fetch(`/api/boards/${boardId}`);
      if (bRes.status === 404) {
        router.replace("/dashboard");
        return;
      }
      if (!bRes.ok) throw new Error("Failed to load dashboard");
      const b = (await bRes.json()) as BoardMeta;
      setBoard(b);
      replaceDefinition(b.definition, { resetUndo: true });
      prefetchSchemasForDefinition(b.definition);

      const [projRes, dRes] = await Promise.all([
        fetch(`/api/projects/${b.projectId}`),
        fetch(`/api/boards/${boardId}/data`),
      ]);

      if (projRes.ok) {
        const proj = (await projRes.json()) as {
          trackerSchemas: TrackerSchema[];
        };
        setProjectTrackers(proj.trackerSchemas ?? []);
      } else {
        setProjectTrackers([]);
      }

      if (dRes.ok) {
        const dj = (await dRes.json()) as {
          elements: Record<string, BoardElementPayload>;
        };
        setData(dj.elements ?? {});
      } else {
        setData({});
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setTimeout(() => {
        persistOk.current = true;
      }, 0);
    }
  }, [boardId, router, prefetchSchemasForDefinition, replaceDefinition]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!definition) return;
    prefetchSchemasForDefinition(definition);
  }, [definition, prefetchSchemasForDefinition]);

  useEffect(() => {
    if (!definition || !persistOk.current) return;
    const gen = ++saveGeneration.current;
    const handle = setTimeout(async () => {
      setSaveError(null);
      setPersistStatus("saving");
      try {
        const res = await fetch(`/api/boards/${boardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPersistStatus("error");
          setSaveError((j as { error?: string }).error ?? "Save failed");
          return;
        }
        if (gen !== saveGeneration.current) return;
        setPersistStatus("saved");
        const dRes = await fetch(`/api/boards/${boardId}/data`);
        if (gen !== saveGeneration.current) return;
        if (dRes.ok) {
          const dj = (await dRes.json()) as {
            elements: Record<string, BoardElementPayload>;
          };
          setData(dj.elements ?? {});
        }
      } catch {
        setPersistStatus("error");
        setSaveError("Save failed");
      }
    }, 900);
    return () => clearTimeout(handle);
  }, [definition, boardId]);

  const handleBoardRename = useCallback(
    async (next: string) => {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((j as { error?: string }).error ?? "Rename failed");
      }
      setBoard((prev) => (prev ? { ...prev, name: next } : null));
    },
    [boardId],
  );

  useBoardNavBar({
    boardId,
    name: board?.name ?? "",
    mode: "edit",
    enabled: Boolean(board && definition && !loading),
    onRename: handleBoardRename,
    persistStatus,
    persistError: saveError,
  });

  const scopedTrackers = useMemo(
    () => trackersInScope(projectTrackers, board?.moduleId ?? null),
    [projectTrackers, board?.moduleId],
  );

  /** Warm default tracker schema so Stat/Table/Chart append without waiting on the network. */
  useEffect(() => {
    const tid = scopedTrackers[0]?.id;
    if (!tid) return;
    loadSchema(tid);
  }, [scopedTrackers, loadSchema]);

  const appendWidget = useCallback(
    (
      kind: BoardElement["type"],
      schema: AssembledSchema,
      trackerSchemaId: string,
    ) => {
      mutateDefinition((prev) => {
        const placeId = getNextPlaceId(prev.elements);
        const el =
          kind === "stat"
            ? buildDefaultStatElement(trackerSchemaId, schema, placeId)
            : kind === "table"
              ? buildDefaultTableElement(trackerSchemaId, schema, placeId)
              : buildDefaultChartElement(trackerSchemaId, schema, placeId);
        if (!el) return prev;
        return {
          ...prev,
          version: BOARD_DEFINITION_VERSION,
          elements: [...prev.elements, el],
        };
      });
    },
    [mutateDefinition],
  );

  const handleAddStat = useCallback(() => {
    if (scopedTrackers.length === 0) return;
    const tid = scopedTrackers[0]!.id;
    const cached = schemaByTracker[tid];
    if (cached?.grids?.length) {
      appendWidget("stat", cached, tid);
      return;
    }
    setAddingWidget("stat");
    void fetchTrackerAssembledSchema(tid)
      .then((s) => {
        setSchemaByTracker((prev) => ({ ...prev, [tid]: s }));
        if (!s?.grids?.length) return;
        appendWidget("stat", s, tid);
      })
      .finally(() => setAddingWidget(null));
  }, [scopedTrackers, schemaByTracker, appendWidget]);

  const handleAddTable = useCallback(() => {
    if (scopedTrackers.length === 0) return;
    const tid = scopedTrackers[0]!.id;
    const cached = schemaByTracker[tid];
    if (cached?.grids?.length) {
      appendWidget("table", cached, tid);
      return;
    }
    setAddingWidget("table");
    void fetchTrackerAssembledSchema(tid)
      .then((s) => {
        setSchemaByTracker((prev) => ({ ...prev, [tid]: s }));
        if (!s?.grids?.length) return;
        appendWidget("table", s, tid);
      })
      .finally(() => setAddingWidget(null));
  }, [scopedTrackers, schemaByTracker, appendWidget]);

  const handleAddChart = useCallback(() => {
    if (scopedTrackers.length === 0) return;
    const tid = scopedTrackers[0]!.id;
    const cached = schemaByTracker[tid];
    if (cached?.grids?.length) {
      appendWidget("chart", cached, tid);
      return;
    }
    setAddingWidget("chart");
    void fetchTrackerAssembledSchema(tid)
      .then((s) => {
        setSchemaByTracker((prev) => ({ ...prev, [tid]: s }));
        if (!s?.grids?.length) return;
        appendWidget("chart", s, tid);
      })
      .finally(() => setAddingWidget(null));
  }, [scopedTrackers, schemaByTracker, appendWidget]);

  const updateElementById = useCallback(
    (id: string, updater: (el: BoardElement) => BoardElement) => {
      mutateDefinition((prev) => ({
        ...prev,
        elements: prev.elements.map((e) => (e.id === id ? updater(e) : e)),
      }));
    },
    [mutateDefinition],
  );

  const removeElementById = useCallback(
    (id: string) => {
      mutateDefinition((prev) => ({
        ...prev,
        elements: prev.elements.filter((e) => e.id !== id),
      }));
    },
    [mutateDefinition],
  );

  const handleTitleChange = useCallback(
    (id: string, title: string | undefined) => {
      updateElementById(id, (e) => ({ ...e, title }));
    },
    [updateElementById],
  );

  if (loading && !board) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 pt-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (loadError || !board || !definition) {
    return (
      <div className="flex h-screen items-center justify-center p-6 pt-12 text-sm text-destructive">
        {loadError ?? "Not found"}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "box-border flex h-screen min-h-0 flex-col overflow-hidden bg-background pt-12 text-foreground selection:bg-primary selection:text-primary-foreground",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col px-0 pb-1 pt-2 sm:px-2 sm:pb-3 sm:pt-3">
        <BoardEditorPanel
          editMode={editMode}
          setEditMode={setEditMode}
          saveError={saveError}
          extraToolbar={
            editMode ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1 rounded-sm text-xs"
                disabled={!canUndo}
                onClick={() => undo()}
                aria-label="Undo"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </Button>
            ) : null
          }
        >
          {editMode ? (
            <BoardBlockEditor
              definition={definition}
              data={data}
              scopedTrackers={scopedTrackers}
              schemaByTracker={schemaByTracker}
              onDefinitionChange={mutateDefinition}
              onSchemaNeeded={loadSchema}
            />
          ) : (
            <div className="flex flex-col gap-4 p-4">
              <p className="text-sm text-muted-foreground">
                View mode will display the rendered blocks here.
              </p>
            </div>
          )}
        </BoardEditorPanel>
      </div>
    </div>
  );
}
