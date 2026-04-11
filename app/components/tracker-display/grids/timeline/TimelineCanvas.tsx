"use client";

import type { CSSProperties } from "react";
import { useMemo, memo } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { gridBadge } from "@/lib/grid-styles";
import type { TimelineItem, TimelineView } from "./types";

export interface TimelineCanvasProps {
  items: TimelineItem[];
  swimlanes: string[];
  timeRange: { start: Date; end: Date; days: number };
  view: TimelineView;
  swimlaneFieldId?: string;
  minContentWidthPx: number;
  timelineClickToAddEnabled: boolean;
  onTimelineClick: (date: Date) => void;
  onItemClick: (rowIndex: number) => void;
}

function timelineItemStyle(
  item: TimelineItem,
  rangeStart: Date,
  rangeEnd: Date,
): CSSProperties {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const itemStartMs = Math.max(item.startDate.getTime(), rangeStart.getTime());
  const itemEndMs = Math.min(item.endDate.getTime(), rangeEnd.getTime());
  const left = ((itemStartMs - rangeStart.getTime()) / totalMs) * 100;
  const width = ((itemEndMs - itemStartMs) / totalMs) * 100;
  return {
    left: `${left}%`,
    width: `${Math.max(width, 2)}%`,
    top: "6px",
  };
}

export const TimelineCanvas = memo(function TimelineCanvas({
  items,
  swimlanes,
  timeRange,
  view,
  swimlaneFieldId,
  minContentWidthPx,
  timelineClickToAddEnabled,
  onTimelineClick,
  onItemClick,
}: TimelineCanvasProps) {
  const { start, end } = timeRange;

  const timeMarkers = useMemo(() => {
    const markers: Date[] = [];
    const current = new Date(start);
    while (current < end) {
      markers.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return markers;
  }, [start, end]);

  const getItemsForSwimlane = (swimlane: string) => {
    if (!swimlaneFieldId) return items;
    return items.filter((item) => {
      const value = item.row[swimlaneFieldId];
      const itemSwimlane = value ? String(value) : "Unassigned";
      return itemSwimlane === swimlane;
    });
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineClickToAddEnabled) return;
    if ((e.target as HTMLElement).closest("[data-timeline-item]")) return;

    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = rect.width > 0 ? x / rect.width : 0;
    const totalMs = end.getTime() - start.getTime();
    const clickMs = start.getTime() + totalMs * percentage;
    onTimelineClick(new Date(clickMs));
  };

  return (
    <div
      className="flex flex-col h-full min-w-[320px]"
      style={{ minWidth: Math.max(minContentWidthPx, 320) }}
    >
      <div className="flex border-b">
        <div className="w-24 md:w-40 flex-shrink-0 border-r bg-muted/30 p-2 md:p-3">
          <span className="text-[10px] md:text-xs font-medium text-muted-foreground">
            {swimlaneFieldId ? "Group" : "Items"}
          </span>
        </div>

        <div className="flex-1 relative" style={{ height: "32px" }}>
          {timeMarkers.map((date, i) => {
            const left = (i / (timeMarkers.length - 1 || 1)) * 100;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <div
                key={i}
                className="absolute top-0 h-full border-l"
                style={{ left: `${left}%` }}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 text-[8px] md:text-[10px] whitespace-nowrap",
                    isWeekend
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground",
                  )}
                >
                  {view === "day"
                    ? date.toLocaleTimeString("en-US", { hour: "numeric" })
                    : date.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {swimlanes.map((swimlane) => {
          const swimlaneItems = getItemsForSwimlane(swimlane);
          return (
            <div
              key={swimlane}
              className="flex border-b min-h-[40px] md:min-h-[48px] hover:bg-muted/10"
            >
              <div className="w-24 md:w-40 flex-shrink-0 border-r bg-muted/20 p-1.5 md:p-2 flex items-center">
                <span className="text-xs md:text-sm font-medium truncate">
                  {swimlane}
                </span>
                <span
                  className={cn(
                    gridBadge("default"),
                    "ml-1.5 md:ml-2 text-[9px] md:text-[11px]",
                  )}
                >
                  {swimlaneItems.length}
                </span>
              </div>

              <div
                className={cn(
                  "flex-1 relative",
                  timelineClickToAddEnabled && "cursor-pointer",
                )}
                style={{ height: "40px" }}
                onClick={handleTrackClick}
              >
                {timeMarkers.map((date, i) => {
                  const left = (i / (timeMarkers.length - 1 || 1)) * 100;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "absolute top-0 h-full border-l",
                        isWeekend ? "bg-muted/10" : "",
                      )}
                      style={{ left: `${left}%` }}
                    />
                  );
                })}

                {swimlaneItems.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    data-timeline-item
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item.rowIndex);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onItemClick(item.rowIndex);
                      }
                    }}
                    className={cn(
                      "absolute h-6 md:h-8 rounded-sm px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs truncate",
                      "bg-primary/10 text-primary border border-primary/20",
                      "hover:bg-primary/20 transition-colors z-[1]",
                    )}
                    style={timelineItemStyle(item, start, end)}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4">
            <Calendar className="h-6 w-6 md:h-8 md:w-8 mb-2 opacity-50" />
            <p className="text-xs md:text-sm text-center">
              No items in this time range
            </p>
            <p className="text-[10px] md:text-xs text-center">
              Click on the timeline to add an item
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
