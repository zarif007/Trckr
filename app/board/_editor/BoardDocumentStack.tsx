"use client";

import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import {
  SECTION_STACK_GAP,
  TAB_CONTENT_INNER,
} from "@/app/components/tracker-display/layout/layout-tokens";
import type {
  BoardDefinition,
  BoardElement,
} from "@/lib/boards/board-definition";
import type { AssembledSchema } from "@/lib/boards/assembled-tracker-schema";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import { sortBoardElementsByDocumentOrder } from "@/lib/boards/document-layout";
import type { TrackerSchema } from "@/app/dashboard/dashboard-context";
import { BoardElementBlock } from "./BoardElementBlock";

export function BoardDocumentStack({
  definition,
  data,
  editMode,
  scopedTrackers,
  schemaByTracker,
  onSchemaNeeded,
  onUpdateElement,
  onRemoveElement,
  onTitleChange,
  onAddStat,
  onAddTable,
  onAddChart,
  addingWidget,
  isNew,
  moduleScoped,
}: {
  definition: BoardDefinition;
  data: Record<string, BoardElementPayload> | null;
  editMode: boolean;
  scopedTrackers: TrackerSchema[];
  schemaByTracker: Record<string, AssembledSchema | null>;
  onSchemaNeeded: (trackerId: string) => void;
  onUpdateElement: (id: string, fn: (el: BoardElement) => BoardElement) => void;
  onRemoveElement: (id: string) => void;
  onTitleChange: (id: string, title: string | undefined) => void;
  onAddStat: () => void;
  onAddTable: () => void;
  onAddChart: () => void;
  addingWidget: null | "stat" | "table" | "chart";
  isNew: boolean;
  moduleScoped: boolean;
}) {
  const ordered = sortBoardElementsByDocumentOrder(definition.elements);
  const disabled = scopedTrackers.length === 0 || addingWidget !== null;

  return (
    <div className={cn("mx-auto w-full max-w-3xl", TAB_CONTENT_INNER)}>
      <div className={SECTION_STACK_GAP}>
        {ordered.map((el) => (
          <BoardElementBlock
            key={el.id}
            element={el}
            payload={data?.[el.id]}
            editMode={editMode}
            scopedTrackers={scopedTrackers}
            schema={schemaByTracker[el.source.trackerSchemaId] ?? null}
            onSchemaNeeded={onSchemaNeeded}
            onTitleChange={(t) => onTitleChange(el.id, t)}
            onUpdate={(fn) => onUpdateElement(el.id, fn)}
            onRemove={() => onRemoveElement(el.id)}
          />
        ))}
      </div>

      {editMode && (
        <div
          className={cn(
            "mt-6 flex flex-col gap-3 rounded-sm border p-3 sm:flex-row sm:items-center sm:justify-between",
            theme.uiChrome.border,
            theme.patterns.card,
          )}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Add block</p>
            {isNew && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Widgets bind to trackers
                {moduleScoped ? " in this module" : ""}. Autosaves like schema
                edit.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn("h-8 rounded-sm text-xs", theme.patterns.inputBase)}
              disabled={disabled}
              onClick={onAddStat}
            >
              {addingWidget === "stat" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1 h-3.5 w-3.5" />
              )}
              Stat
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn("h-8 rounded-sm text-xs", theme.patterns.inputBase)}
              disabled={disabled}
              onClick={onAddTable}
            >
              {addingWidget === "table" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1 h-3.5 w-3.5" />
              )}
              Table
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn("h-8 rounded-sm text-xs", theme.patterns.inputBase)}
              disabled={disabled}
              onClick={onAddChart}
            >
              {addingWidget === "chart" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1 h-3.5 w-3.5" />
              )}
              Chart
            </Button>
          </div>
        </div>
      )}

      {!editMode && ordered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No blocks yet. Switch to Edit to add widgets.
        </p>
      )}
    </div>
  );
}
