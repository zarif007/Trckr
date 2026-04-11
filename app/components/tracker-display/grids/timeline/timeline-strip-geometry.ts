/**
 * Pure geometry for the timeline **strip** (time axis + swimlane tracks + bars).
 *
 * All percentages are relative to `[rangeStart, rangeEnd)` as used by the canvas.
 * Bar `left` / axis ticks use the same formula so day boundaries line up with bar starts.
 *
 * @see `TimelineCanvas` for how these values map to CSS.
 */

import type { CSSProperties } from "react";
import type { TimelineItem } from "./types";

/** Layout constants for the scrollable timeline body (not the grid toolbar). */
export const TIMELINE_STRIP_LAYOUT = {
  barHeightPx: 38,
  barGapPx: 6,
  trackPaddingYPx: 10,
  /** Minimum swimlane track height when there are no or few stacked bars. */
  minTrackHeightPx: 56,
  /** Sticky header row over the time axis (day view shows more detail). */
  axisHeaderHeightDayPx: 48,
  axisHeaderHeightDefaultPx: 44,
  /** Minimum CSS width for very short ranges so labels stay tappable. */
  minBarWidthCss: "3rem",
  /** Minimum scroll width of the inner canvas (px), beyond `minContentWidthPx` from domain. */
  minCanvasWidthFloorPx: 320,
} as const;

/**
 * Horizontal position of an instant within the visible range, as a percentage [0, 100].
 * Values are clamped to the range so markers and bars stay aligned at edges.
 */
export function timelineInstantLeftPercent(
  instant: Date,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  if (totalMs <= 0) return 0;
  const t = instant.getTime();
  const clamped = Math.max(
    rangeStart.getTime(),
    Math.min(rangeEnd.getTime(), t),
  );
  return ((clamped - rangeStart.getTime()) / totalMs) * 100;
}

/**
 * Maps a timestamp from pointer hit-testing to the **local calendar day start**
 * for that instant (midnight in the browser timezone).
 */
export function localDayStartFromTimelineMs(ms: number): Date {
  const raw = new Date(ms);
  return new Date(
    raw.getFullYear(),
    raw.getMonth(),
    raw.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Absolute positioning for one bar: `left` / `width` percentages and fixed `top` / `height` in px.
 */
export function buildTimelineBarPositionStyle(
  item: TimelineItem,
  rangeStart: Date,
  rangeEnd: Date,
  stackIndex: number,
  layout: typeof TIMELINE_STRIP_LAYOUT = TIMELINE_STRIP_LAYOUT,
): CSSProperties {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const itemStartMs = Math.max(item.startDate.getTime(), rangeStart.getTime());
  const itemEndMs = Math.min(item.endDate.getTime(), rangeEnd.getTime());
  const left = timelineInstantLeftPercent(
    new Date(itemStartMs),
    rangeStart,
    rangeEnd,
  );
  const widthPct =
    totalMs > 0 ? ((itemEndMs - itemStartMs) / totalMs) * 100 : 0;
  const { barHeightPx, barGapPx, trackPaddingYPx, minBarWidthCss } = layout;
  return {
    left: `${left}%`,
    width: `max(${Math.max(widthPct, 0.35).toFixed(3)}%, ${minBarWidthCss})`,
    top: trackPaddingYPx + stackIndex * (barHeightPx + barGapPx),
    height: barHeightPx,
  };
}

export function axisHeaderHeightPx(
  view: "day" | "week" | "month" | "quarter",
  layout: typeof TIMELINE_STRIP_LAYOUT = TIMELINE_STRIP_LAYOUT,
): number {
  return view === "day"
    ? layout.axisHeaderHeightDayPx
    : layout.axisHeaderHeightDefaultPx;
}

export function swimlaneTrackHeightPx(
  stackDepth: number,
  layout: typeof TIMELINE_STRIP_LAYOUT = TIMELINE_STRIP_LAYOUT,
): number {
  const { minTrackHeightPx, trackPaddingYPx, barHeightPx, barGapPx } = layout;
  const body =
    trackPaddingYPx * 2 +
    stackDepth * barHeightPx +
    (stackDepth > 0 ? (stackDepth - 1) * barGapPx : 0);
  return Math.max(minTrackHeightPx, body);
}
