import { describe, expect, it } from "vitest";
import {
  buildTimelineBarPositionStyle,
  localDayStartFromTimelineMs,
  swimlaneTrackHeightPx,
  timelineInstantLeftPercent,
} from "../timeline-strip-geometry";
import type { TimelineItem } from "../types";

describe("timelineInstantLeftPercent", () => {
  it("returns 0 at range start and 100 at range end", () => {
    const a = new Date(2024, 5, 1, 0, 0, 0, 0);
    const b = new Date(2024, 5, 8, 0, 0, 0, 0);
    expect(timelineInstantLeftPercent(a, a, b)).toBe(0);
    expect(timelineInstantLeftPercent(b, a, b)).toBe(100);
  });

  it("returns 0 for degenerate range", () => {
    const t = new Date(2024, 5, 1);
    expect(timelineInstantLeftPercent(t, t, t)).toBe(0);
  });
});

describe("localDayStartFromTimelineMs", () => {
  it("truncates to local midnight", () => {
    const d = localDayStartFromTimelineMs(
      new Date(2024, 5, 15, 14, 30, 0, 0).getTime(),
    );
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(15);
  });
});

describe("buildTimelineBarPositionStyle", () => {
  it("positions bar within range", () => {
    const rangeStart = new Date(2024, 5, 1, 0, 0, 0, 0);
    const rangeEnd = new Date(2024, 5, 8, 0, 0, 0, 0);
    const item: TimelineItem = {
      row: {},
      rowIndex: 0,
      startDate: new Date(2024, 5, 2, 0, 0, 0, 0),
      endDate: new Date(2024, 5, 4, 0, 0, 0, 0),
      title: "X",
    };
    const style = buildTimelineBarPositionStyle(
      item,
      rangeStart,
      rangeEnd,
      0,
    );
    expect(style.left).toMatch(/%$/);
    expect(style.width).toMatch(/max\(/);
    expect(style.height).toBeGreaterThan(0);
    expect(style.top).toBeGreaterThanOrEqual(0);
  });
});

describe("swimlaneTrackHeightPx", () => {
  it("grows with stack depth", () => {
    const h1 = swimlaneTrackHeightPx(1);
    const h3 = swimlaneTrackHeightPx(3);
    expect(h3).toBeGreaterThan(h1);
  });
});
