"use client";

import { useState, useMemo, useCallback } from "react";
import type { CalendarView } from "./types";
import { buildMonthGridCells, buildWeekDaysAround } from "./calendar-month-utils";
import { buildCellEventsForDate } from "./calendar-event-utils";

export interface UseCalendarGridModelParams {
  rows: Array<Record<string, unknown>>;
  dateFieldId: string | undefined;
  initialView: CalendarView;
}

/**
 * View state, navigation, and memoized day structures for the calendar surface.
 * Pure date math lives in `calendar-month-utils` / `calendar-event-utils`.
 */
export function useCalendarGridModel({
  rows,
  dateFieldId,
  initialView,
}: UseCalendarGridModelParams) {
  const [view, setView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const calendarDays = useMemo(
    () => buildMonthGridCells(currentDate),
    [currentDate],
  );
  const weekDays = useMemo(
    () => buildWeekDaysAround(currentDate),
    [currentDate],
  );

  const getEventsForDate = useCallback(
    (date: Date) => buildCellEventsForDate(rows, date, dateFieldId),
    [rows, dateFieldId],
  );

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === "month") {
        next.setMonth(next.getMonth() - 1);
      } else if (view === "week") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === "month") {
        next.setMonth(next.getMonth() + 1);
      } else if (view === "week") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  }, [view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const monthYearDisplay = useMemo(
    () =>
      currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentDate],
  );

  const weekOfLabel = useMemo(
    () =>
      `Week of ${currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
    [currentDate],
  );

  const dayViewTitle = useMemo(
    () =>
      currentDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [currentDate],
  );

  return {
    view,
    setView,
    currentDate,
    calendarDays,
    weekDays,
    getEventsForDate,
    isToday,
    goToPrevious,
    goToNext,
    goToToday,
    monthYearDisplay,
    weekOfLabel,
    dayViewTitle,
  };
}
