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
  swimlaneFieldId?: string;
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
  swimlaneFieldId,
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
        "sticky top-0 z-10 flex shrink-0 bg-background",
        gridRow,
      )}
    >
      <div
        className={cn(
          gridColumnHeader,
          "w-28 md:w-44 shrink-0 flex items-end py-2",
        )}
      >
        <span className="text-[10px] md:text-xs font-medium text-muted-foreground">
          {swimlaneFieldId ? "Group" : "Items"}
        </span>
      </div>

      <div
        className={cn(
          "flex-1 relative min-w-0 border-l bg-muted/40",
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
                    "absolute top-2 left-1 max-w-[6rem] truncate text-xs sm:text-sm font-medium leading-tight",
                    isWeekend
                      ? "text-muted-foreground/75"
                      : "text-muted-foreground",
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
