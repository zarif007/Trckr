"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { CALENDAR_WEEKDAY_LABELS } from "./constants";
import type { CalendarCellEvent } from "./types";

export interface WeekViewProps {
  weekDays: Date[];
  getEventsForDate: (date: Date) => CalendarCellEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (rowIndex: number) => void;
  isToday: (date: Date) => boolean;
  titleFieldId?: string;
}

export const WeekView = memo(function WeekView({
  weekDays,
  getEventsForDate,
  onDayClick,
  onEventClick,
  isToday,
  titleFieldId,
}: WeekViewProps) {
  return (
    <div className="h-full flex flex-col min-w-[320px]">
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((date, i) => {
          const today = isToday(date);
          return (
            <div
              key={i}
              className={cn(
                "px-1 py-1 md:px-2 md:py-2 text-center",
                today && "bg-info/5",
              )}
            >
              <div className="text-[10px] md:text-xs text-muted-foreground uppercase">
                <span className="hidden md:inline">{CALENDAR_WEEKDAY_LABELS[i]}</span>
                <span className="md:hidden">
                  {CALENDAR_WEEKDAY_LABELS[i].slice(0, 1)}
                </span>
              </div>
              <div
                className={cn(
                  "text-sm md:text-lg font-semibold w-6 h-6 md:w-8 md:h-8 mx-auto flex items-center justify-center rounded-sm",
                  today && "bg-primary text-primary-foreground",
                )}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {weekDays.map((date, i) => {
          const events = getEventsForDate(date);
          const today = isToday(date);

          return (
            <div
              key={i}
              onClick={() => onDayClick(date)}
              className={cn(
                "p-1 md:p-2 border-r min-h-[150px] md:min-h-[200px] cursor-pointer transition-colors",
                "hover:bg-muted/30",
                today && "bg-info/5",
              )}
            >
              <div className="space-y-1 md:space-y-1.5">
                {events.map((event, j) => (
                  <div
                    key={j}
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
                      "text-[10px] md:text-xs px-1 md:px-2 py-1 md:py-1.5 rounded-sm truncate",
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
            </div>
          );
        })}
      </div>
    </div>
  );
});
