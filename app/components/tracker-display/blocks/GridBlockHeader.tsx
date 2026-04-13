"use client";

import { Table2, LayoutGrid, FormInput, Calendar, GanttChart, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrackerGrid } from "../types";
import type { GridType } from "../types";
import { normalizeGridType } from "../view-utils";
import {
  InlineEditableName,
  useBlockControls,
  LabelWithBlockControls,
} from "../layout";

const VIEW_ICONS: Record<GridType, LucideIcon> = {
  table: Table2,
  kanban: LayoutGrid,
  div: FormInput,
  calendar: Calendar,
  timeline: GanttChart,
};

const VIEW_LABELS: Record<GridType, string> = {
  table: "Table",
  kanban: "Kanban",
  div: "Form",
  calendar: "Calendar",
  timeline: "Timeline",
};

const VIEW_COLORS: Record<GridType, string> = {
  table: "bg-info/10 text-info border border-info/20",
  kanban: "bg-warning/10 text-warning border border-warning/20",
  div: "bg-success/10 text-success border border-success/20",
  calendar: "bg-primary/10 text-primary border border-primary/20",
  timeline: "bg-chart-2/10 text-chart-2 border border-chart-2/20",
};

/** Grid type badge: small pill showing view type. Exported for use in BlockEditor or elsewhere. */
export function GridTypeBadge({ grid, viewType }: { grid: TrackerGrid; viewType?: GridType }) {
  const type = normalizeGridType(viewType ?? grid.views?.[0]?.type ?? grid.type ?? "table");
  const Icon = VIEW_ICONS[type];
  const label = VIEW_LABELS[type];
  const badgeClass = VIEW_COLORS[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] rounded-sm px-1.5 py-0.5 font-medium",
        badgeClass,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export interface GridBlockHeaderProps {
  grid: TrackerGrid;
  name: string;
  editable?: boolean;
  onNameChange?: (name: string) => void;
}

/**
 * Shared grid block header: badge + name (editable or read-only).
 * Same look in edit and view mode. Parent should wrap with space-y-2.5 when followed by GridBlockContent.
 */
export function GridBlockHeader({
  grid,
  name,
  editable = false,
  onNameChange,
}: GridBlockHeaderProps) {
  const controls = useBlockControls();

  const nameContent =
    editable && onNameChange ? (
      <InlineEditableName value={name} onChange={onNameChange} />
    ) : (
      <span className="text-base font-semibold text-foreground truncate leading-7">
        {name}
      </span>
    );

  const badgeAndName = (
    <div className="flex items-center gap-1.5 min-w-0">
      <GridTypeBadge grid={grid} />
      {nameContent}
    </div>
  );

  return (
    <div className="flex items-center w-full min-w-0">
      {controls ? (
        <LabelWithBlockControls
          label={badgeAndName}
          onRemove={controls.onRemove}
          dragHandleProps={controls.dragHandleProps}
          onAddBlockClick={controls.onAddBlockClick}
          isSortable={controls.isSortable}
        />
      ) : (
        badgeAndName
      )}
    </div>
  );
}
