"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { gridColumnHeader, gridRow } from "@/lib/grid-styles";
import {
  axisHeaderHeightPx,
  timelineInstantLeftPercent,
} from "./timeline-strip-geometry";
import type { TimelineView } from "./types";

export interface TimelineStripTimeAxisProps {
  groupingFieldId?: string;
  timeMarkers: Date[];
  labelStep: number;
  rangeStart: Date;
  rangeEnd: Date;
  view: TimelineView;
}

/**
 * Sticky row: corner label + proportional day ticks with sparse labels for dense ranges.
 */
export const TimelineStripTimeAxis = memo(function TimelineStripTimeAxis({
  groupingFieldId,
  timeMarkers,
  labelStep,
  rangeStart,
  rangeEnd,
  view,
}: TimelineStripTimeAxisProps) {
  const axisHeaderHeight = axisHeaderHeightPx(view);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex shrink-0 bg-muted/30",
        gridRow,
      )}
    >
      <div
        className={cn(
          gridColumnHeader,
          "border-b-0",
          "w-32 md:w-48 shrink-0 flex items-end border-r py-2.5",
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:text-[11px]">
          {groupingFieldId ? "Lanes" : "All items"}
        </span>
      </div>

      <div
        className={cn(
          "relative min-w-0 flex-1 border-l bg-muted/35",
          theme.uiChrome.border,
        )}
        style={{ height: axisHeaderHeight }}
      >
        {timeMarkers.map((date, i) => {
          const left = timelineInstantLeftPercent(date, rangeStart, rangeEnd);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const showLabel =
            i % labelStep === 0 || i === timeMarkers.length - 1;
          return (
            <div
              key={date.getTime()}
              className={cn(
                "absolute top-0 h-full border-l",
                theme.uiChrome.border,
              )}
              style={{ left: `${left}%` }}
            >
              {showLabel ? (
                <span
                  className={cn(
                    "absolute left-1 top-2.5 max-w-[6.5rem] truncate text-xs font-semibold leading-tight sm:max-w-[7rem] sm:text-sm",
                    isWeekend
                      ? "text-muted-foreground/80"
                      : "text-foreground/90",
                  )}
                >
                  {view === "day"
                    ? date.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : view === "week"
                      ? date.toLocaleDateString("en-US", {
                          weekday: "short",
                          day: "numeric",
                        })
                      : date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});
