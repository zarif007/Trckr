import type { TimelineItem, TimelineView } from "./types";

export function viewSpanDays(view: TimelineView): number {
  const map: Record<TimelineView, number> = {
    day: 1,
    week: 7,
    month: 30,
    quarter: 90,
  };
  return map[view];
}

export function buildTimeRange(
  currentDate: Date,
  view: TimelineView,
): { start: Date; end: Date; days: number } {
  const days = viewSpanDays(view);
  const start = new Date(currentDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return { start, end, days };
}

export function buildTimelineItems(
  rows: Array<Record<string, unknown>>,
  dateFieldId: string | undefined,
  endDateFieldId: string | undefined,
  titleFieldId: string | undefined,
): TimelineItem[] {
  return rows
    .map((row, rowIndex) => {
      if (!dateFieldId) return null;
      const startValue = row[dateFieldId];
      if (!startValue) return null;

      const startDate = new Date(startValue as string);
      if (Number.isNaN(startDate.getTime())) return null;

      let endDate: Date;
      if (endDateFieldId && row[endDateFieldId]) {
        endDate = new Date(row[endDateFieldId] as string);
        if (Number.isNaN(endDate.getTime())) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }
      } else {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }

      return {
        row,
        rowIndex,
        startDate,
        endDate,
        title: titleFieldId
          ? String(row[titleFieldId] ?? "Untitled")
          : "Item",
      };
    })
    .filter((item): item is TimelineItem => item !== null);
}

export function buildSwimlanes(
  timelineItems: TimelineItem[],
  swimlaneFieldId: string | undefined,
): string[] {
  if (!swimlaneFieldId) return ["All Items"];

  const groups = new Map<string, number>();
  timelineItems.forEach((item) => {
    const value = item.row[swimlaneFieldId];
    const key = value ? String(value) : "Unassigned";
    groups.set(key, (groups.get(key) ?? 0) + 1);
  });

  return Array.from(groups.keys()).sort();
}

export function timeAxisMinWidthPx(view: TimelineView): number {
  return Math.max(720, viewSpanDays(view) * 40);
}

export function formatTimelineRangeLabel(
  timeRange: { start: Date; end: Date },
  view: TimelineView,
): string {
  const { start, end } = timeRange;
  if (view === "day") {
    return start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}
