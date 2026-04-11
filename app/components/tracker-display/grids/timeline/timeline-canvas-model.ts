/**
 * Pure helpers for timeline canvas data prep (markers, grouping, dnd ids).
 * Keeps `TimelineCanvas` focused on wiring and leaves logic easy to unit test.
 */

import type { PlacedTimelineBar, TimelineSwimlaneLane } from "./types";

/** One local midnight per day in `[rangeStart, rangeEnd)` (same contract as `buildTimeRange`). */
export function buildCalendarDayMarkers(
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const markers: Date[] = [];
  const current = new Date(rangeStart);
  while (current < rangeEnd) {
    markers.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return markers;
}

/**
 * When there are many days, skip labeling some ticks so the axis stays readable.
 */
export function computeAxisLabelStep(markerCount: number): number {
  if (markerCount <= 14) return 1;
  return Math.max(1, Math.floor(markerCount / 8));
}

/** Places each bar list under its swimlane `id` (only keys present on `lanes`). */
export function groupPlacedBarsByLane(
  placedBars: PlacedTimelineBar[],
  lanes: TimelineSwimlaneLane[],
): Map<string, PlacedTimelineBar[]> {
  const m = new Map<string, PlacedTimelineBar[]>();
  for (const lane of lanes) {
    m.set(lane.id, []);
  }
  for (const p of placedBars) {
    const list = m.get(p.swimlaneKey);
    if (list) list.push(p);
  }
  return m;
}

/** Per-lane stack depth (rows of overlapping bars) for track height. */
export function maxStackDepthByLane(
  placedBars: PlacedTimelineBar[],
  lanes: TimelineSwimlaneLane[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const lane of lanes) {
    m.set(lane.id, 1);
  }
  for (const p of placedBars) {
    const cur = m.get(p.swimlaneKey) ?? 1;
    m.set(p.swimlaneKey, Math.max(cur, p.stackDepth));
  }
  return m;
}

const LANE_PREFIX = "tllane:";

/** Parses @dnd-kit `over.id` from a swimlane droppable. */
export function parseTimelineDropLaneId(overId: string | null): string | null {
  if (overId == null) return null;
  const s = String(overId);
  return s.startsWith(LANE_PREFIX) ? s.slice(LANE_PREFIX.length) : null;
}
