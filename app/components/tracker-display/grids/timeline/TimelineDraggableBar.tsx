"use client";

import type { CSSProperties } from "react";
import { memo } from "react";
import { GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { rowAccentStyleFromRow } from "@/lib/tracker-grid-rows";
import { timelineBarDragId } from "./timeline-domain";
import {
  TIMELINE_STRIP_LAYOUT,
  buildTimelineBarPositionStyle,
} from "./timeline-strip-geometry";
import type { PlacedTimelineBar } from "./types";

export interface TimelineDraggableBarProps {
  placed: PlacedTimelineBar;
  rangeStart: Date;
  rangeEnd: Date;
  mutateViaRowApi: boolean;
  dragEnabled: boolean;
  onBarClick: (rowIndex: number) => void;
}

/**
 * One draggable bar in a swimlane track. Drag handle vs title click are split so
 * editing does not fight drag activation (`PointerSensor` distance threshold on the parent).
 */
export const TimelineDraggableBar = memo(function TimelineDraggableBar({
  placed,
  rangeStart,
  rangeEnd,
  mutateViaRowApi,
  dragEnabled,
  onBarClick,
}: TimelineDraggableBarProps) {
  const { item } = placed;
  const id = timelineBarDragId(item.row, item.rowIndex, mutateViaRowApi);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !dragEnabled,
    data: { rowIndex: item.rowIndex },
  });

  const rowAccentStyle = rowAccentStyleFromRow(
    item.row as Record<string, unknown>,
    "chip",
  );
  const style: CSSProperties = {
    ...buildTimelineBarPositionStyle(
      item,
      rangeStart,
      rangeEnd,
      placed.stackIndex,
      TIMELINE_STRIP_LAYOUT,
    ),
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 20 : 2,
    ...rowAccentStyle,
  };

  return (
    <div
      ref={setNodeRef}
      data-timeline-item
      style={style}
      className={cn(
        "box-border absolute flex min-w-0 items-stretch gap-1 overflow-hidden",
        theme.radius.md,
        "border px-2 py-1 text-xs sm:text-sm leading-tight",
        theme.uiChrome.border,
        theme.border.gridChromeHover,
        rowAccentStyle ? "text-foreground shadow-none" : "bg-card text-foreground shadow-none",
        /* Do not transition `transform`: dnd-kit updates it every frame; CSS transition fights it and feels janky. */
        isDragging
          ? "z-10 border-primary/50 bg-muted/80 opacity-[0.97] ring-0 transition-none"
          : rowAccentStyle
            ? "transition-[filter] duration-100 hover:brightness-[1.03]"
            : "transition-colors duration-100 hover:bg-muted/30",
        dragEnabled ? "cursor-default" : "cursor-pointer",
      )}
    >
      {dragEnabled ? (
        <button
          type="button"
          className={cn(
            "shrink-0 rounded-sm px-1 text-muted-foreground hover:text-foreground hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
          aria-label="Drag to move or change group"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      ) : null}
      <button
        type="button"
        className={cn(
          "min-w-0 flex-1 truncate text-left font-semibold text-foreground tracking-tight",
          "rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onBarClick(item.rowIndex);
        }}
      >
        {item.title}
      </button>
    </div>
  );
});
