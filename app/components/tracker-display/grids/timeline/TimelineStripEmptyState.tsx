"use client";

import { memo } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { gridEmptyState } from "@/lib/grid-styles";

export interface TimelineStripEmptyStateProps {
  timelineClickToAddEnabled: boolean;
}

/**
 * Covers the swimlane region when there are no bars in range (pointer-events none).
 */
export const TimelineStripEmptyState = memo(function TimelineStripEmptyState({
  timelineClickToAddEnabled,
}: TimelineStripEmptyStateProps) {
  return (
    <div
      className={cn(
        gridEmptyState,
        "absolute inset-0 z-[1] pointer-events-none bg-background/80",
      )}
    >
      <Calendar className="h-6 w-6 md:h-8 md:w-8 mb-2 opacity-50" />
      <p className="text-xs md:text-sm text-center text-muted-foreground">
        No items in this time range
      </p>
      <p className="text-[10px] md:text-xs text-center text-muted-foreground">
        {timelineClickToAddEnabled
          ? "Click the timeline to add an entry"
          : "Adjust the date range or add entries elsewhere"}
      </p>
    </div>
  );
});
