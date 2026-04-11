"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarCellEvent } from "./types";

export interface DayViewProps {
  date: Date;
  getEventsForDate: (date: Date) => CalendarCellEvent[];
  onTimeClick: (date: Date) => void;
  onEventClick: (rowIndex: number) => void;
  isToday: (date: Date) => boolean;
  titleFieldId?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const DayView = memo(function DayView({
  date,
  getEventsForDate,
  onTimeClick,
  onEventClick,
  isToday,
  titleFieldId,
}: DayViewProps) {
  const events = getEventsForDate(date);
  const today = isToday(date);

  return (
    <div className="h-full flex flex-col min-w-[280px]">
      <div className={cn("px-2 md:px-4 py-2 md:py-3 border-b", today && "bg-info/5")}>
        <div className="text-xs md:text-sm text-muted-foreground">
          {date.toLocaleDateString("en-US", { weekday: "long" })}
        </div>
        <div className="text-xl md:text-2xl font-semibold">{date.getDate()}</div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex">
          <div className="w-12 md:w-16 flex-shrink-0 border-r bg-muted/20">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-12 md:h-14 px-1 md:px-2 text-[10px] md:text-xs text-muted-foreground text-right border-b flex items-start justify-end pt-1"
              >
                {hour === 0
                  ? "12a"
                  : hour === 12
                    ? "12p"
                    : hour > 12
                      ? `${hour - 12}p`
                      : `${hour}a`}
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                onClick={() => {
                  const clickDate = new Date(date);
                  clickDate.setHours(hour);
                  onTimeClick(clickDate);
                }}
                className="h-12 md:h-14 border-b cursor-pointer hover:bg-muted/20 transition-colors"
              />
            ))}

            {events.length > 0 && (
              <div className="absolute top-2 left-1 md:left-2 right-1 md:right-2 space-y-1">
                {events.map((event, i) => (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event.rowIndex);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onEventClick(event.rowIndex);
                      }
                    }}
                    className={cn(
                      "text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 rounded-sm truncate",
                      "bg-primary/10 text-primary border border-primary/20",
                      "cursor-pointer hover:bg-primary/15",
                    )}
                  >
                    {titleFieldId
                      ? String(
                          (event.row[titleFieldId] as string) ?? "Untitled",
                        )
                      : "Event"}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
