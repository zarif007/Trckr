/**
 * Timeline **domain**: calendar-day parsing, visible range, row → `TimelineItem` geometry,
 * swimlane lane lists, stack placement, persisted date shifts, and DnD id helpers.
 *
 * UI layout percentages and bar pixel math live in `timeline-strip-geometry.ts` + canvas components.
 */

import { parseDateFieldStoredValue } from "@/lib/date-field-value";
import type {
  PlacedTimelineBar,
  TimelineItem,
  TimelineSwimlaneLane,
  TimelineView,
} from "./types";

/** Single lane when no swimlane field is configured. */
export const TIMELINE_ALL_LANE_ID = "__timeline_all__";

const TIMELINE_BAR_DND_PREFIX = "tlbar:";

export function timelineBarDragId(
  row: Record<string, unknown>,
  rowIndex: number,
  useRowApi: boolean,
): string {
  if (useRowApi) {
    const rid = row._rowId;
    if (typeof rid === "string" && rid.length > 0) {
      return `${TIMELINE_BAR_DND_PREFIX}${rid}`;
    }
  }
  return `${TIMELINE_BAR_DND_PREFIX}idx:${rowIndex}`;
}

export function timelineLaneDropId(laneId: string): string {
  return `tllane:${laneId}`;
}

function toOptionId(o: { id?: string; value?: unknown; label?: string }): string {
  return String(o.id ?? o.value ?? o.label ?? "").trim();
}

/** `YYYY-MM-DD` only (no time / timezone ambiguity). */
const CALENDAR_DAY_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDayOnlyString(value: unknown): boolean {
  return typeof value === "string" && CALENDAR_DAY_ONLY.test(value.trim());
}

/**
 * Parses a stored calendar day at **local midnight** so timeline ticks (also local)
 * align with the date shown in forms (e.g. `2024-06-16` starts on the 16th column).
 */
export function parseCalendarDayLocal(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      0,
      0,
      0,
      0,
    );
  }
  const s = String(value).trim();
  const m = CALENDAR_DAY_ONLY.exec(s);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(y, mo, d, 0, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatCalendarDayLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addLocalCalendarDays(d: Date, days: number): Date {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + days);
  return r;
}

function parseTimelineStoredDate(value: unknown): Date | null {
  const d = parseDateFieldStoredValue(value);
  return d ?? null;
}

function toIsoDateUtc(d: Date): string {
  return d.toISOString().split("T")[0] ?? "";
}

/**
 * Ensures configured start/end date columns store an ordered range: start ≤ end (by instant).
 * Mutates nothing; returns a shallow copy of `values` when a swap is applied.
 */
export function normalizeTimelineDateFieldsForRow(
  values: Record<string, unknown>,
  startFieldId: string,
  endFieldId: string,
): Record<string, unknown> {
  if (!startFieldId || !endFieldId || startFieldId === endFieldId) {
    return values;
  }
  const startDate = parseTimelineStoredDate(values[startFieldId]);
  const endDate = parseTimelineStoredDate(values[endFieldId]);
  if (!startDate || !endDate) return values;
  if (startDate.getTime() <= endDate.getTime()) return values;

  const earlier = new Date(Math.min(startDate.getTime(), endDate.getTime()));
  const later = new Date(Math.max(startDate.getTime(), endDate.getTime()));

  const startRaw = values[startFieldId];
  const endRaw = values[endFieldId];
  const useLocalDay =
    isCalendarDayOnlyString(startRaw) && isCalendarDayOnlyString(endRaw);

  return {
    ...values,
    [startFieldId]: useLocalDay
      ? formatCalendarDayLocal(earlier)
      : toIsoDateUtc(earlier),
    [endFieldId]: useLocalDay
      ? formatCalendarDayLocal(later)
      : toIsoDateUtc(later),
  };
}

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

      const endRaw = endDateFieldId ? row[endDateFieldId] : undefined;
      const hasEnd = endRaw != null && endRaw !== "";
      const startDayOnly = isCalendarDayOnlyString(startValue);
      const endDayOnly = hasEnd && isCalendarDayOnlyString(endRaw);

      let startDate: Date;
      let endDate: Date;

      if (startDayOnly && (!hasEnd || endDayOnly)) {
        const startDay = parseCalendarDayLocal(startValue);
        if (!startDay) return null;
        let lastInclusiveDay = startDay;
        if (endDayOnly) {
          const endParsed = parseCalendarDayLocal(endRaw);
          if (endParsed) lastInclusiveDay = endParsed;
        }
        if (lastInclusiveDay.getTime() < startDay.getTime()) {
          const t = startDay;
          startDate = lastInclusiveDay;
          endDate = addLocalCalendarDays(t, 1);
        } else {
          startDate = startDay;
          endDate = addLocalCalendarDays(lastInclusiveDay, 1);
        }
      } else if (!hasEnd) {
        const parsedOnlyStart = parseTimelineStoredDate(startValue);
        if (!parsedOnlyStart) return null;
        startDate = parsedOnlyStart;
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      } else if (startDayOnly && hasEnd && !endDayOnly) {
        startDate = parseCalendarDayLocal(startValue)!;
        const parsedEndMixed = parseTimelineStoredDate(endRaw);
        if (!parsedEndMixed) {
          endDate = addLocalCalendarDays(startDate, 1);
        } else if (parsedEndMixed.getTime() < startDate.getTime()) {
          endDate = startDate;
          startDate = parsedEndMixed;
        } else {
          endDate = parsedEndMixed;
        }
      } else if (!startDayOnly && endDayOnly) {
        const parsedStartWithEndDay = parseTimelineStoredDate(startValue);
        if (!parsedStartWithEndDay) return null;
        startDate = parsedStartWithEndDay;
        const endLast = parseCalendarDayLocal(endRaw);
        if (!endLast) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        } else {
          const startMid = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
          );
          let firstDay = startMid;
          let lastDay = endLast;
          if (lastDay.getTime() < firstDay.getTime()) {
            const t = firstDay;
            firstDay = lastDay;
            lastDay = t;
          }
          startDate = firstDay;
          endDate = addLocalCalendarDays(lastDay, 1);
        }
      } else {
        const parsedStartFull = parseTimelineStoredDate(startValue);
        if (!parsedStartFull) return null;
        startDate = parsedStartFull;
        const parsedEndFull = parseTimelineStoredDate(endRaw);
        if (!parsedEndFull) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        } else if (parsedEndFull.getTime() < startDate.getTime()) {
          endDate = startDate;
          startDate = parsedEndFull;
        } else {
          endDate = parsedEndFull;
        }
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

/**
 * Canonical swimlane key for a row (matches kanban column id / option id).
 */
export function timelineSwimlaneKeyFromRow(
  row: Record<string, unknown>,
  groupingFieldId: string | undefined,
): string {
  if (!groupingFieldId) return TIMELINE_ALL_LANE_ID;
  return String(row[groupingFieldId] ?? "").trim();
}

/**
 * Ordered swimlanes: full option list when the swimlane field is option-backed (kanban parity),
 * otherwise distinct values from rows. Always includes an empty-id "Unassigned" lane when using options.
 */
export function buildTimelineSwimlaneLanes(params: {
  groupingFieldId: string | undefined;
  resolvedOptions: Array<{ id?: string; value?: unknown; label?: string }>;
  timelineItems: TimelineItem[];
}): TimelineSwimlaneLane[] {
  const { groupingFieldId, resolvedOptions, timelineItems } = params;
  if (!groupingFieldId) {
    return [{ id: TIMELINE_ALL_LANE_ID, label: "All items" }];
  }

  const itemKeys = new Set(
    timelineItems.map((t) =>
      timelineSwimlaneKeyFromRow(t.row, groupingFieldId),
    ),
  );

  if (resolvedOptions.length > 0) {
    const lanes: TimelineSwimlaneLane[] = resolvedOptions.map((o) => {
      const id = toOptionId(o);
      return { id, label: String(o.label ?? (id.length > 0 ? id : "Option")) };
    });
    const seen = new Set(lanes.map((l) => l.id));
    if (!seen.has("")) {
      lanes.push({ id: "", label: "Unassigned" });
      seen.add("");
    }
    for (const k of itemKeys) {
      if (!seen.has(k)) {
        seen.add(k);
        lanes.push({
          id: k,
          label: k.length > 0 ? k : "Unassigned",
        });
      }
    }
    return lanes;
  }

  const keys = Array.from(itemKeys).sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) {
    return [{ id: "", label: "Unassigned" }];
  }
  return keys.map((k) => ({
    id: k,
    label: k.length > 0 ? k : "Unassigned",
  }));
}

/**
 * Greedy lane stacking for concurrent bars within one swimlane.
 */
export function assignStackLanesForItems(
  items: TimelineItem[],
): Map<number, { stackIndex: number; stackDepth: number }> {
  const result = new Map<
    number,
    { stackIndex: number; stackDepth: number }
  >();
  if (items.length === 0) return result;

  const sorted = [...items].sort((a, b) => {
    const ds = a.startDate.getTime() - b.startDate.getTime();
    if (ds !== 0) return ds;
    return a.endDate.getTime() - b.endDate.getTime();
  });

  /** Max end instant for the last bar placed in each stack row. */
  const rowMaxEndMs: number[] = [];

  for (const item of sorted) {
    const startMs = item.startDate.getTime();
    let placed = -1;
    for (let i = 0; i < rowMaxEndMs.length; i++) {
      if (startMs >= rowMaxEndMs[i]) {
        placed = i;
        rowMaxEndMs[i] = item.endDate.getTime();
        break;
      }
    }
    if (placed < 0) {
      placed = rowMaxEndMs.length;
      rowMaxEndMs.push(item.endDate.getTime());
    }
    result.set(item.rowIndex, { stackIndex: placed, stackDepth: 0 });
  }

  const finalDepth = Math.max(1, rowMaxEndMs.length);
  for (const item of items) {
    const cur = result.get(item.rowIndex);
    if (cur) result.set(item.rowIndex, { stackIndex: cur.stackIndex, stackDepth: finalDepth });
  }
  return result;
}

/**
 * Builds placed bars per swimlane with vertical stack indices for the canvas.
 */
export function computePlacedTimelineBars(
  timelineItems: TimelineItem[],
  groupingFieldId: string | undefined,
  lanes: TimelineSwimlaneLane[],
): PlacedTimelineBar[] {
  const laneIds = new Set(lanes.map((l) => l.id));
  const byLane = new Map<string, TimelineItem[]>();
  for (const lane of lanes) {
    byLane.set(lane.id, []);
  }

  for (const item of timelineItems) {
    let key = timelineSwimlaneKeyFromRow(item.row, groupingFieldId);
    if (!laneIds.has(key)) {
      key = groupingFieldId ? "" : TIMELINE_ALL_LANE_ID;
      if (!laneIds.has(key)) key = lanes[0]?.id ?? key;
    }
    const list = byLane.get(key);
    if (list) list.push(item);
  }

  const stackByRow = new Map<
    number,
    { stackIndex: number; stackDepth: number }
  >();
  for (const lane of lanes) {
    const laneItems = byLane.get(lane.id) ?? [];
    const local = assignStackLanesForItems(laneItems);
    for (const [rowIndex, v] of local) {
      stackByRow.set(rowIndex, v);
    }
  }

  return timelineItems.map((item) => {
    let key = timelineSwimlaneKeyFromRow(item.row, groupingFieldId);
    if (!laneIds.has(key)) {
      key = groupingFieldId ? "" : TIMELINE_ALL_LANE_ID;
      if (!laneIds.has(key)) key = lanes[0]?.id ?? key;
    }
    const stack = stackByRow.get(item.rowIndex) ?? {
      stackIndex: 0,
      stackDepth: 1,
    };
    return {
      item,
      swimlaneKey: key,
      stackIndex: stack.stackIndex,
      stackDepth: stack.stackDepth,
    };
  });
}

/**
 * Shifts stored ISO date start/end by whole calendar days (date-field semantics).
 */
export function shiftTimelineStoredDateRangeByDays(
  row: Record<string, unknown>,
  dateFieldId: string,
  endDateFieldId: string,
  deltaDays: number,
): Record<string, unknown> | null {
  if (!deltaDays) return null;
  const startRaw = row[dateFieldId];
  const endRaw = row[endDateFieldId];
  if (
    isCalendarDayOnlyString(startRaw) &&
    isCalendarDayOnlyString(endRaw)
  ) {
    const sd = parseCalendarDayLocal(startRaw);
    const ed = parseCalendarDayLocal(endRaw);
    if (!sd || !ed) return null;
    const ns = addLocalCalendarDays(sd, deltaDays);
    const ne = addLocalCalendarDays(ed, deltaDays);
    return {
      [dateFieldId]: formatCalendarDayLocal(ns),
      [endDateFieldId]: formatCalendarDayLocal(ne),
    };
  }
  const startDate = parseTimelineStoredDate(startRaw);
  const endDate = parseTimelineStoredDate(endRaw);
  if (!startDate || !endDate) return null;
  const ns = new Date(startDate);
  ns.setDate(ns.getDate() + deltaDays);
  const ne = new Date(endDate);
  ne.setDate(ne.getDate() + deltaDays);
  return {
    [dateFieldId]: toIsoDateUtc(ns),
    [endDateFieldId]: toIsoDateUtc(ne),
  };
}

export function timeAxisMinWidthPx(view: TimelineView): number {
  /** Horizontal strip: day column width (scroll), independent of toolbar. */
  return Math.max(840, viewSpanDays(view) * 56);
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
