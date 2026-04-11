import { describe, expect, it } from "vitest";
import {
  buildCalendarDayMarkers,
  computeAxisLabelStep,
  groupPlacedBarsByLane,
  maxStackDepthByLane,
  parseTimelineDropLaneId,
} from "../timeline-canvas-model";
import type {
  PlacedTimelineBar,
  TimelineItem,
  TimelineSwimlaneLane,
} from "../types";

function stubItem(): TimelineItem {
  return {
    row: {},
    rowIndex: 0,
    startDate: new Date(2024, 0, 1),
    endDate: new Date(2024, 0, 2),
    title: "",
  };
}

describe("buildCalendarDayMarkers", () => {
  it("emits one marker per day in half-open range", () => {
    const start = new Date(2024, 5, 1, 0, 0, 0, 0);
    const end = new Date(2024, 5, 4, 0, 0, 0, 0);
    const m = buildCalendarDayMarkers(start, end);
    expect(m).toHaveLength(3);
    expect(m[0]!.getDate()).toBe(1);
    expect(m[2]!.getDate()).toBe(3);
  });
});

describe("computeAxisLabelStep", () => {
  it("returns 1 for short ranges", () => {
    expect(computeAxisLabelStep(10)).toBe(1);
  });

  it("skips labels for long ranges", () => {
    expect(computeAxisLabelStep(40)).toBeGreaterThan(1);
  });
});

describe("groupPlacedBarsByLane", () => {
  it("buckets by swimlane key", () => {
    const lanes: TimelineSwimlaneLane[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const placed: PlacedTimelineBar[] = [
      {
        item: stubItem(),
        swimlaneKey: "a",
        stackIndex: 0,
        stackDepth: 1,
      },
    ];
    const m = groupPlacedBarsByLane(placed, lanes);
    expect(m.get("a")).toHaveLength(1);
    expect(m.get("b")).toHaveLength(0);
  });
});

describe("maxStackDepthByLane", () => {
  it("tracks max stack depth per lane", () => {
    const lanes: TimelineSwimlaneLane[] = [{ id: "x", label: "X" }];
    const placed: PlacedTimelineBar[] = [
      {
        item: stubItem(),
        swimlaneKey: "x",
        stackIndex: 0,
        stackDepth: 2,
      },
      {
        item: stubItem(),
        swimlaneKey: "x",
        stackIndex: 1,
        stackDepth: 2,
      },
    ];
    const m = maxStackDepthByLane(placed, lanes);
    expect(m.get("x")).toBe(2);
  });
});

describe("parseTimelineDropLaneId", () => {
  it("parses lane prefix", () => {
    expect(parseTimelineDropLaneId("tllane:done")).toBe("done");
  });

  it("returns null for unrelated ids", () => {
    expect(parseTimelineDropLaneId("tlbar:x")).toBeNull();
    expect(parseTimelineDropLaneId(null)).toBeNull();
  });
});
