"use client";

import { useState } from "react";
import { LayoutList } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { InlineEditableName } from "@/app/components/tracker-display";
import {
  BlockControlsProvider,
  LabelWithBlockControls,
} from "@/app/components/tracker-display/layout";
import {
  GRID_BLOCK_INNER,
  GRID_ITEM_WRAPPER,
  SECTION_BAR_CLASS,
} from "@/app/components/tracker-display/layout/layout-tokens";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { BoardElement } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import type { TrackerSchema } from "@/app/dashboard/dashboard-context";
import type { AssembledSchema } from "@/lib/boards/assembled-tracker-schema";
import { BoardBlockChart } from "./BoardBlockChart";
import { BoardWidgetSettingsForm } from "./BoardWidgetSettingsForm";

function typeFallbackLabel(type: BoardElement["type"]): string {
  switch (type) {
    case "stat":
      return "Stat";
    case "table":
      return "Table";
    case "chart":
      return "Chart";
  }
}

function TypeBadge({ type }: { type: BoardElement["type"] }) {
  const label = typeFallbackLabel(type);
  const color =
    type === "stat"
      ? "bg-info/10 text-info border border-info/20"
      : type === "table"
        ? "bg-warning/10 text-warning border border-warning/20"
        : "bg-primary/10 text-primary border border-primary/20";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium",
        color,
      )}
    >
      {label}
    </span>
  );
}

export function BoardElementBlock({
  element,
  payload,
  editMode,
  scopedTrackers,
  schema,
  onSchemaNeeded,
  onTitleChange,
  onUpdate,
  onRemove,
}: {
  element: BoardElement;
  payload: BoardElementPayload | undefined;
  editMode: boolean;
  scopedTrackers: TrackerSchema[];
  schema: AssembledSchema | null;
  onSchemaNeeded: (trackerId: string) => void;
  onTitleChange: (title: string | undefined) => void;
  onUpdate: (fn: (el: BoardElement) => BoardElement) => void;
  onRemove: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fallback = typeFallbackLabel(element.type);
  const displayTitle = element.title?.trim() || fallback;

  const handleTitleChange = (name: string) => {
    const t = name.trim();
    if (t === fallback || !t) onTitleChange(undefined);
    else onTitleChange(t);
  };

  const titleRow = editMode ? (
    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
      <PopoverAnchor asChild>
        <div className="w-full min-w-0">
          <BlockControlsProvider
            value={{
              dragHandleProps: {},
              onRemove,
              isSortable: false,
              label: displayTitle,
            }}
          >
            <div className={cn(SECTION_BAR_CLASS, "items-center")}>
              <LayoutList
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <LabelWithBlockControls
                  isSortable={false}
                  label={
                    <span className="flex min-w-0 items-center gap-2">
                      <TypeBadge type={element.type} />
                      <InlineEditableName
                        value={displayTitle}
                        onChange={handleTitleChange}
                        className="min-w-0 truncate text-left text-base font-semibold leading-7 text-foreground transition-colors hover:cursor-text hover:text-primary"
                      />
                    </span>
                  }
                  onRemove={onRemove}
                  onSettings={() => setSettingsOpen(true)}
                />
              </span>
            </div>
          </BlockControlsProvider>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className={cn("w-auto p-0", theme.patterns.floatingChrome)}
        onClick={(e) => e.stopPropagation()}
      >
        <BoardWidgetSettingsForm
          element={element}
          scopedTrackers={scopedTrackers}
          schema={schema}
          onSchemaNeeded={onSchemaNeeded}
          onChange={onUpdate}
          showRemoveButton={false}
          onRemove={() => {
            setSettingsOpen(false);
            onRemove();
          }}
        />
      </PopoverContent>
    </Popover>
  ) : (
    <div className={cn(SECTION_BAR_CLASS, "items-center gap-2")}>
      <LayoutList className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <TypeBadge type={element.type} />
        <span className="truncate text-base font-semibold leading-7 text-foreground">
          {displayTitle}
        </span>
      </span>
    </div>
  );

  return (
    <div className={GRID_ITEM_WRAPPER}>
      <div
        className={cn(
          GRID_BLOCK_INNER,
          "rounded-sm border",
          theme.uiChrome.border,
        )}
      >
        {titleRow}
        <div className="px-2 pb-3 pt-1 sm:px-3">
          {renderPayload(element, payload)}
        </div>
      </div>
    </div>
  );
}

function renderPayload(
  element: BoardElement,
  payload: BoardElementPayload | undefined,
) {
  if (!payload) {
    return <p className="text-xs text-muted-foreground">No data yet.</p>;
  }
  if (payload.error) {
    return <p className="text-xs text-destructive">{payload.error}</p>;
  }
  if (payload.kind === "stat") {
    const v = payload.value;
    return (
      <p className="text-2xl font-semibold tabular-nums leading-tight">
        {v == null ? "—" : formatStat(v)}
        {payload.truncated && (
          <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
            Partial data (row cap)
          </span>
        )}
      </p>
    );
  }
  if (payload.kind === "table") {
    if (payload.columns.length === 0) {
      return (
        <p className="text-xs text-muted-foreground">Configure columns.</p>
      );
    }
    return (
      <div className="max-h-56 overflow-auto text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {payload.columns.map((c) => (
                <th
                  key={c.fieldId}
                  className={cn(
                    "border-b p-1.5 text-left font-medium",
                    theme.uiChrome.border,
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.rows.map((row, ri) => (
              <tr key={ri}>
                {payload.columns.map((c) => (
                  <td
                    key={c.fieldId}
                    className={cn(
                      "border-b p-1.5 align-top",
                      theme.uiChrome.border,
                    )}
                  >
                    {formatCell(row[c.fieldId])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (payload.kind === "chart") {
    const chartData = payload.points.map((p) => ({
      name: p.label,
      value: p.value,
    }));
    return (
      <BoardBlockChart
        kind={payload.chartKind === "line" ? "line" : "bar"}
        data={chartData}
        truncated={payload.truncated}
      />
    );
  }
  return null;
}

function formatStat(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function formatCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
