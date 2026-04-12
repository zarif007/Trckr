"use client";

/**
 * Timeline **body**: sticky time axis, swimlane tracks, stacked bars, and @dnd-kit drag.
 *
 * - Geometry / grouping: `timeline-strip-geometry`, `timeline-canvas-model`
 * - Drop preview while dragging: `useTimelineStripDropPreview`
 * - Subcomponents: `TimelineStrip*`, `TimelineDraggableBar`, `TimelineSwimlaneTrack`
 *
 * The parent shell (`TrackerTimelineGrid`) owns toolbar, range navigation, and dialogs.
 */

import { useMemo, memo, useRef, useState, useCallback } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { timelineBarDragId } from "./timeline-domain";
import { timelinePointerThenCenterCollision } from "./timeline-dnd";
import {
  buildCalendarDayMarkers,
  computeAxisLabelStep,
  groupPlacedBarsByLane,
  maxStackDepthByLane,
  parseTimelineDropLaneId,
} from "./timeline-canvas-model";
import { formatTimelineDropPreviewLabel } from "./timeline-drop-preview-format";
import { TIMELINE_STRIP_LAYOUT } from "./timeline-strip-geometry";
import { useTimelineStripDropPreview } from "./useTimelineStripDropPreview";
import { TimelineStripEmptyState } from "./TimelineStripEmptyState";
import { TimelineStripTimeAxis } from "./TimelineStripTimeAxis";
import { TimelineSwimlaneTrack } from "./TimelineSwimlaneTrack";
import type { TimelineCanvasProps } from "./types";

export const TimelineCanvas = memo(function TimelineCanvas({
  placedBars,
  swimlanes,
  timeRange,
  view,
  groupingFieldId,
  minContentWidthPx,
  timelineClickToAddEnabled,
  mutateViaRowApi,
  timelineDragEnabled,
  onTimelineClick,
  onItemClick,
  onBarDragEnd,
}: TimelineCanvasProps) {
  const { start, end } = timeRange;
  const primaryTrackRef = useRef<HTMLDivElement | null>(null);
  const [activeBarId, setActiveBarId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const timeMarkers = useMemo(
    () => buildCalendarDayMarkers(start, end),
    [start, end],
  );

  const labelStep = useMemo(
    () => computeAxisLabelStep(timeMarkers.length),
    [timeMarkers.length],
  );

  const placedByLane = useMemo(
    () => groupPlacedBarsByLane(placedBars, swimlanes),
    [placedBars, swimlanes],
  );

  const maxStackByLane = useMemo(
    () => maxStackDepthByLane(placedBars, swimlanes),
    [placedBars, swimlanes],
  );

  const { dropPreview, dropPreviewLeftPct } = useTimelineStripDropPreview({
    activeBarId,
    timelineDragEnabled,
    rangeStart: start,
    rangeEnd: end,
  });

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineClickToAddEnabled) return;
      if ((e.target as HTMLElement).closest("[data-timeline-item]")) return;

      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = rect.width > 0 ? x / rect.width : 0;
      const totalMs = end.getTime() - start.getTime();
      const clickMs = start.getTime() + totalMs * percentage;
      onTimelineClick(new Date(clickMs));
    },
    [timelineClickToAddEnabled, end, start, onTimelineClick],
  );

  const setPrimaryTrackRef = useCallback((el: HTMLDivElement | null) => {
    primaryTrackRef.current = el;
  }, []);

  const activePlaced = useMemo(() => {
    if (!activeBarId) return null;
    return (
      placedBars.find(
        (p) =>
          timelineBarDragId(p.item.row, p.item.rowIndex, mutateViaRowApi) ===
          activeBarId,
      ) ?? null
    );
  }, [activeBarId, placedBars, mutateViaRowApi]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveBarId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveBarId(null);
      if (!onBarDragEnd || !timelineDragEnabled) return;
      const current = event.active.data.current as
        | { rowIndex?: number }
        | undefined;
      const rowIndex = current?.rowIndex;
      if (typeof rowIndex !== "number") return;
      const overId = event.over?.id != null ? String(event.over.id) : null;
      const targetLaneId = parseTimelineDropLaneId(overId);
      const w = primaryTrackRef.current?.getBoundingClientRect().width ?? 0;
      onBarDragEnd({
        rowIndex,
        deltaX: event.delta.x,
        trackWidthPx: w,
        targetLaneId,
      });
    },
    [onBarDragEnd, timelineDragEnabled],
  );

  const clearDrag = useCallback(() => {
    setActiveBarId(null);
  }, []);

  const { minCanvasWidthFloorPx, barHeightPx } = TIMELINE_STRIP_LAYOUT;
  const globalStripEmpty = placedBars.length === 0;

  const inner = (
    <div
      className="flex min-w-0 w-full flex-col overflow-hidden bg-card"
      style={{
        minWidth: Math.max(minContentWidthPx, minCanvasWidthFloorPx),
      }}
    >
      <TimelineStripTimeAxis
        groupingFieldId={groupingFieldId}
        timeMarkers={timeMarkers}
        labelStep={labelStep}
        rangeStart={start}
        rangeEnd={end}
        view={view}
      />

      <div
        className={cn(
          "relative w-full bg-muted/20",
          globalStripEmpty &&
            "min-h-[200px] sm:min-h-[240px] md:min-h-[280px]",
        )}
      >
        {swimlanes.map((lane, laneIndex) => {
          const placedInLane = placedByLane.get(lane.id) ?? [];
          const stackDepth = maxStackByLane.get(lane.id) ?? 1;
          return (
            <TimelineSwimlaneTrack
              key={lane.id}
              lane={lane}
              laneIndex={laneIndex}
              placedInLane={placedInLane}
              rangeStart={start}
              rangeEnd={end}
              timeMarkers={timeMarkers}
              timelineClickToAddEnabled={timelineClickToAddEnabled}
              onTrackClick={handleTrackClick}
              mutateViaRowApi={mutateViaRowApi}
              dragEnabled={timelineDragEnabled}
              onBarClick={onItemClick}
              stackDepth={stackDepth}
              setPrimaryTrackRef={setPrimaryTrackRef}
              dropPreviewLeftPct={dropPreviewLeftPct}
              hideLaneEmptyHint={globalStripEmpty}
            />
          );
        })}

        {globalStripEmpty && (
          <TimelineStripEmptyState
            timelineClickToAddEnabled={timelineClickToAddEnabled}
          />
        )}
      </div>
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={timelinePointerThenCenterCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={clearDrag}
    >
      {inner}
      {dropPreview && timelineDragEnabled ? (
        <div
          className={cn(
            "fixed z-[10000] max-w-[11rem] pointer-events-none rounded-sm px-2 py-1 text-[11px] font-medium tabular-nums",
            theme.patterns.floatingChrome,
            theme.radius.md,
            "bg-background text-foreground shadow-none ring-0",
          )}
          style={{
            left: Math.max(
              8,
              Math.min(
                (typeof window !== "undefined" ? window.innerWidth : 1200) -
                  168,
                dropPreview.clientX + 10,
              ),
            ),
            top: Math.max(8, dropPreview.clientY + 12),
          }}
        >
          {formatTimelineDropPreviewLabel(dropPreview.day, view)}
        </div>
      ) : null}
      <DragOverlay
        dropAnimation={null}
        className="shadow-none ring-0"
        style={{
          boxShadow: "none",
          WebkitBoxShadow: "none",
          filter: "none",
          pointerEvents: "none",
        }}
      >
        {activePlaced ? (
          <div
            className={cn(
              "flex min-w-[120px] max-w-md items-stretch gap-0.5 overflow-hidden border px-2 py-1 text-xs",
              theme.radius.md,
              theme.uiChrome.floating,
              "bg-card text-foreground shadow-none ring-0",
            )}
            style={{
              width: "min(280px, 40vw)",
              height: barHeightPx,
              boxShadow: "none",
              WebkitBoxShadow: "none",
              filter: "none",
            }}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">
              {activePlaced.item.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});
