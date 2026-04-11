"use client";

import { useState, useMemo, useCallback } from "react";
import type { TimelineView, TimelineItem } from "./types";
import {
  buildTimeRange,
  buildTimelineItems,
  timeAxisMinWidthPx,
  formatTimelineRangeLabel,
  viewSpanDays,
} from "./timeline-domain";

export interface UseTimelineGridModelParams {
  rows: Array<Record<string, unknown>>;
  dateFieldId: string | undefined;
  endDateFieldId: string | undefined;
  titleFieldId: string | undefined;
  initialView: TimelineView;
}

/**
 * Timeline zoom level, visible window, items, and navigation — pure range math in `timeline-domain`.
 */
export function useTimelineGridModel({
  rows,
  dateFieldId,
  endDateFieldId,
  titleFieldId,
  initialView,
}: UseTimelineGridModelParams) {
  const [view, setView] = useState<TimelineView>(initialView);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const timeRange = useMemo(
    () => buildTimeRange(currentDate, view),
    [currentDate, view],
  );

  const timelineItems = useMemo(
    (): TimelineItem[] =>
      buildTimelineItems(
        rows,
        dateFieldId,
        endDateFieldId,
        titleFieldId,
      ),
    [rows, dateFieldId, endDateFieldId, titleFieldId],
  );

  const dateDisplay = useMemo(
    () => formatTimelineRangeLabel(timeRange, view),
    [timeRange, view],
  );

  const timeAxisMinWidthPxValue = useMemo(() => timeAxisMinWidthPx(view), [view]);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      const step = viewSpanDays(view);
      next.setDate(next.getDate() - step);
      return next;
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      const step = viewSpanDays(view);
      next.setDate(next.getDate() + step);
      return next;
    });
  }, [view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  return {
    view,
    setView,
    currentDate,
    timeRange,
    timelineItems,
    dateDisplay,
    timeAxisMinWidthPx: timeAxisMinWidthPxValue,
    goToPrevious,
    goToNext,
    goToToday,
  };
}
