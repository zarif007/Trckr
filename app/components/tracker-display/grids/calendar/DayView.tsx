"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { rowAccentStyleFromRow } from "@/lib/tracker-grid-rows";
import type { CalendarCellEvent } from "./types";
import { parseEventDateTime } from "./calendar-event-utils";

export interface DayViewProps {
  date: Date;
  getEventsForDate: (date: Date) => CalendarCellEvent[];
  onTimeClick: (date: Date) => void;
  onEventClick: (rowIndex: number) => void;
  isToday: (date: Date) => boolean;
  titleFieldId?: string;
  dateFieldId?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const HOUR_HEIGHT_PX = 48; // h-12 = 48px on mobile
const HOUR_HEIGHT_MD_PX = 56; // md:h-14 = 56px on desktop

export const DayView = memo(function DayView({
  date,
  getEventsForDate,
  onTimeClick,
  onEventClick,
  isToday,
  titleFieldId,
  dateFieldId,
}: DayViewProps) {
  const events = getEventsForDate(date);
  const today = isToday(date);

  // Parse time information for events
  const eventsWithTime = events.map((event) => {
    if (!dateFieldId) return { ...event, hour: undefined, minute: undefined };

    const timeInfo = parseEventDateTime(event.row, dateFieldId);
    return {
      ...event,
      hour: timeInfo?.hour,
      minute: timeInfo?.minute,
    };
  });

  // Separate all-day events (no time) from timed events
  const allDayEvents = eventsWithTime.filter(e => e.hour === undefined);
  const timedEvents = eventsWithTime.filter(e => e.hour !== undefined);

  // Calculate position for timed event
  const calculateEventPosition = (hour: number, minute: number = 0) => {
    const totalMinutes = hour * 60 + minute;
    const topPx = (totalMinutes / 60) * HOUR_HEIGHT_PX;
    const topMdPx = (totalMinutes / 60) * HOUR_HEIGHT_MD_PX;
    return { topPx, topMdPx };
  };

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
                className={cn(
                  "h-12 md:h-14 px-1 md:px-2 text-[10px] md:text-xs text-muted-foreground text-right border-b flex items-start justify-end pt-1",
                  hour === 23 && "border-b-0",
                )}
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
                className={cn(
                  "h-12 md:h-14 border-b cursor-pointer hover:bg-muted/20 transition-colors",
                  hour === 23 && "border-b-0",
                )}
              />
            ))}

            {/* All-day events (no time) - stacked at top */}
            {allDayEvents.length > 0 && (
              <div className="absolute top-2 left-1 md:left-2 right-1 md:right-2 space-y-1 z-10">
                {allDayEvents.map((event, i) => {
                  const accent = rowAccentStyleFromRow(
                    event.row as Record<string, unknown>,
                    "chip",
                  );
                  return (
                  <div
                    key={`allday-${i}`}
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
                      "text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-sm truncate border",
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
                    <span className="text-[10px] md:text-xs opacity-60 mr-1">All day:</span>
                    {titleFieldId
                      ? String((event.row[titleFieldId] as string) ?? "Untitled")
                      : "Event"}
                  </div>
                );
                })}
              </div>
            )}

            {/* Timed events - positioned by hour/minute */}
            {timedEvents.map((event, i) => {
              if (event.hour === undefined) return null;
              const { topPx } = calculateEventPosition(event.hour, event.minute);
              const accent = rowAccentStyleFromRow(
                event.row as Record<string, unknown>,
                "chip",
              );

              return (
                <div
                  key={`timed-${i}`}
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
                    "absolute left-1 md:left-2 right-1 md:right-2",
                    "text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 rounded-sm truncate border",
                    accent
                      ? cn(
                          "text-foreground cursor-pointer hover:brightness-[1.03] z-[5]",
                          theme.uiChrome.border,
                        )
                      : cn(
                          "bg-primary/10 text-primary border-primary/20",
                          "cursor-pointer hover:bg-primary/15 z-[5]",
                        ),
                  )}
                  style={{
                    top: `${topPx}px`,
                    ...accent,
                  }}
                >
                  <span className="text-[10px] md:text-xs opacity-60 mr-1">
                    {event.hour.toString().padStart(2, '0')}:{(event.minute ?? 0).toString().padStart(2, '0')}
                  </span>
                  {titleFieldId
                    ? String((event.row[titleFieldId] as string) ?? "Untitled")
                    : "Event"}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
