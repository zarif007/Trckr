"use client";

import { memo, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { gridBadge, gridColumnHeader, gridRow } from "@/lib/grid-styles";
import { timelineBarDragId, timelineLaneDropId } from "./timeline-domain";
import {
  TIMELINE_STRIP_LAYOUT,
  swimlaneTrackHeightPx,
  timelineInstantLeftPercent,
} from "./timeline-strip-geometry";
import { TimelineDraggableBar } from "./TimelineDraggableBar";
import type { PlacedTimelineBar, TimelineSwimlaneLane } from "./types";

export interface TimelineSwimlaneTrackProps {
  lane: TimelineSwimlaneLane;
  laneIndex: number;
  placedInLane: PlacedTimelineBar[];
  rangeStart: Date;
  rangeEnd: Date;
  /** One entry per day column (vertical guides); same array as the sticky axis. */
  timeMarkers: Date[];
  timelineClickToAddEnabled: boolean;
  onTrackClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  mutateViaRowApi: boolean;
  dragEnabled: boolean;
  onBarClick: (rowIndex: number) => void;
  stackDepth: number;
  setPrimaryTrackRef: (el: HTMLDivElement | null) => void;
  dropPreviewLeftPct: number | null;
  /** Hide per-lane empty hint when a full-strip empty state is shown above. */
  hideLaneEmptyHint?: boolean;
}

/**
 * One swimlane: label column + droppable track with day grid lines, bars, and empty hint.
 * First lane registers the primary track ref for drag-end width measurement.
 */
export const TimelineSwimlaneTrack = memo(function TimelineSwimlaneTrack({
  lane,
  laneIndex,
  placedInLane,
  rangeStart,
  rangeEnd,
  timeMarkers,
  timelineClickToAddEnabled,
  onTrackClick,
  mutateViaRowApi,
  dragEnabled,
  onBarClick,
  stackDepth,
  setPrimaryTrackRef,
  dropPreviewLeftPct,
  hideLaneEmptyHint = false,
}: TimelineSwimlaneTrackProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: timelineLaneDropId(lane.id),
  });

  const trackHeight = swimlaneTrackHeightPx(stackDepth, TIMELINE_STRIP_LAYOUT);

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      if (laneIndex === 0) setPrimaryTrackRef(el);
    },
    [laneIndex, setNodeRef, setPrimaryTrackRef],
  );

  return (
    <div className={cn(gridRow, "min-h-0")}>
      <div
        className={cn(
          gridColumnHeader,
          "w-32 md:w-48 shrink-0 flex flex-row items-center gap-2 border-r py-2.5",
        )}
      >
        <span className="truncate text-xs font-semibold text-foreground md:text-sm">
          {lane.label}
        </span>
        <span
          className={cn(
            gridBadge("default"),
            "shrink-0 text-[9px] md:text-[11px] tabular-nums",
          )}
        >
          {placedInLane.length}
        </span>
      </div>

      <div
        ref={setRefs}
        data-timeline-track="1"
        className={cn(
          "relative min-w-0 flex-1 bg-background transition-colors",
          theme.uiChrome.border,
          "border-l",
          timelineClickToAddEnabled &&
            "cursor-pointer hover:bg-muted/40 focus-visible:outline-none",
          laneIndex % 2 === 1 && "bg-muted/25",
          isOver && dragEnabled && "bg-primary/10",
        )}
        style={{ height: trackHeight }}
        onClick={onTrackClick}
      >
        {timeMarkers.map((date) => {
          const left = timelineInstantLeftPercent(date, rangeStart, rangeEnd);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div
              key={date.getTime()}
              className={cn(
                "absolute top-0 h-full border-l pointer-events-none",
                theme.uiChrome.border,
                isWeekend ? "bg-muted/30" : "",
              )}
              style={{ left: `${left}%` }}
            />
          );
        })}

        {dropPreviewLeftPct != null ? (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-[5] w-[2px] -translate-x-px rounded-full bg-primary/90"
            style={{ left: `${dropPreviewLeftPct}%` }}
            aria-hidden
          />
        ) : null}

        {placedInLane.map((placed) => (
          <TimelineDraggableBar
            key={timelineBarDragId(
              placed.item.row,
              placed.item.rowIndex,
              mutateViaRowApi,
            )}
            placed={placed}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            mutateViaRowApi={mutateViaRowApi}
            dragEnabled={dragEnabled}
            onBarClick={onBarClick}
          />
        ))}

        {placedInLane.length === 0 && !hideLaneEmptyHint ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center",
              "rounded-sm border border-dashed px-2 py-1.5 text-[10px] text-muted-foreground md:text-xs",
              theme.uiChrome.border,
            )}
          >
            {timelineClickToAddEnabled ? "Click empty space to add" : "No entries"}
          </div>
        ) : null}
      </div>
    </div>
  );
});
