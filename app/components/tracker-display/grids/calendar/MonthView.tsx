"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { gridBadge } from "@/lib/grid-styles";
import { rowAccentStyleFromRow } from "@/lib/tracker-grid-rows";
import { CALENDAR_WEEKDAY_LABELS } from "./constants";
import type { CalendarCellEvent } from "./types";

export interface MonthViewProps {
  days: Array<{ date: Date; isCurrentMonth: boolean }>;
  getEventsForDate: (date: Date) => CalendarCellEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (rowIndex: number) => void;
  isToday: (date: Date) => boolean;
  titleFieldId?: string;
}

export const MonthView = memo(function MonthView({
  days,
  getEventsForDate,
  onDayClick,
  onEventClick,
  isToday,
  titleFieldId,
}: MonthViewProps) {
  return (
    <div className="h-full flex flex-col min-w-[320px]">
      <div className="grid grid-cols-7 border-b">
        {CALENDAR_WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className={cn(
              "px-1 py-1 md:px-2 md:py-1.5 text-[10px] md:text-xs font-medium text-center",
              "text-muted-foreground bg-muted/30",
            )}
          >
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr [&>*:nth-last-child(-n+7)]:border-b-0">
        {days.map(({ date, isCurrentMonth }, index) => {
          const events = getEventsForDate(date);
          const today = isToday(date);

          return (
            <div
              key={index}
              onClick={() => onDayClick(date)}
              className={cn(
                "min-h-[60px] md:min-h-[80px] p-1 md:p-1.5 border-r border-b cursor-pointer transition-colors",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                "hover:bg-muted/30",
                today && "bg-info/5",
              )}
            >
              <div className="flex items-center justify-between mb-0.5 md:mb-1">
                <span
                  className={cn(
                    "text-xs md:text-sm w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-sm",
                    today && "bg-primary text-primary-foreground font-medium",
                  )}
                >
                  {date.getDate()}
                </span>
                {events.length > 0 && (
                  <span
                    className={cn(
                      gridBadge("info"),
                      "text-[9px] md:text-[11px]",
                    )}
                  >
                    {events.length}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 md:space-y-1">
                {events.slice(0, 2).map((event, i) => {
                  const accent = rowAccentStyleFromRow(
                    event.row as Record<string, unknown>,
                    "chip",
                  );
                  return (
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
                    style={accent}
                    className={cn(
                      "text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded-sm truncate border",
                      accent
                        ? cn(
                            "text-foreground cursor-pointer hover:brightness-[1.03]",
                            theme.uiChrome.border,
                          )
                        : cn(
                            "bg-primary/10 text-primary border-primary/20",
                            "cursor-pointer hover:bg-primary/15",
                          ),
                    )}
                  >
                    {titleFieldId
                      ? String(
                          (event.row[titleFieldId] as string) ?? "Untitled",
                        )
                      : "Event"}
                  </div>
                );
                })}
                {events.length > 2 && (
                  <div className="text-[9px] md:text-[10px] text-muted-foreground px-0.5 md:px-1">
                    +{events.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
