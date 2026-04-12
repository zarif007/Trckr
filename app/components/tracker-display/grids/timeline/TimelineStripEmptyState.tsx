"use client";

import { memo } from "react";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

export interface TimelineStripEmptyStateProps {
  timelineClickToAddEnabled: boolean;
}

/**
 * Centered empty state when no bars fall in the visible range (pointer-events none).
 */
export const TimelineStripEmptyState = memo(function TimelineStripEmptyState({
  timelineClickToAddEnabled,
}: TimelineStripEmptyStateProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] flex items-center justify-center p-4 sm:p-6",
        "bg-gradient-to-b from-background/40 via-background/75 to-background/90",
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-sm flex-col items-center gap-3 rounded-sm border px-5 py-7 text-center sm:max-w-md sm:px-8 sm:py-9",
          theme.uiChrome.border,
          theme.radius.md,
          "bg-card/95",
        )}
      >
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border bg-muted/50 sm:h-14 sm:w-14",
            theme.uiChrome.border,
          )}
        >
          <CalendarRange className="h-6 w-6 text-muted-foreground sm:h-7 sm:w-7" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground sm:text-base">
            No entries in this range
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {timelineClickToAddEnabled
              ? "Use the arrows to change the window, or click the timeline to add a row for a day in view."
              : "Move the date range with the arrows, or add rows from another view."}
          </p>
        </div>
      </div>
    </div>
  );
});
