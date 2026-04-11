import { describe, expect, it } from "vitest";
import {
  assignStackLanesForItems,
  buildTimelineItems,
  buildTimelineSwimlaneLanes,
  computePlacedTimelineBars,
  normalizeTimelineDateFieldsForRow,
  shiftTimelineStoredDateRangeByDays,
  TIMELINE_ALL_LANE_ID,
} from "../timeline-domain";
import type { TimelineItem } from "../types";

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("buildTimelineItems", () => {
  it("orders inverted start/end so the bar runs forward in time", () => {
    const rows = [{ start: "2024-06-10", end: "2024-06-01", title: "A" }];
    const items = buildTimelineItems(rows, "start", "end", "title");
    expect(items).toHaveLength(1);
    expect(items[0]!.startDate.getTime()).toBeLessThan(
      items[0]!.endDate.getTime(),
    );
    expect(ymdLocal(items[0]!.startDate)).toBe("2024-06-01");
    /** Inclusive last day Jun 10 → exclusive geometry end is local midnight Jun 11 */
    expect(ymdLocal(items[0]!.endDate)).toBe("2024-06-11");
  });

  it("treats legacy UTC-midnight ISO strings as local calendar days (timeline alignment)", () => {
    const rows = [
      {
        start: "2024-06-15T00:00:00.000Z",
        end: "2024-06-16T00:00:00.000Z",
        title: "Legacy picker",
      },
    ];
    const items = buildTimelineItems(rows, "start", "end", "title");
    expect(items).toHaveLength(1);
    expect(ymdLocal(items[0]!.startDate)).toBe("2024-06-15");
    expect(ymdLocal(items[0]!.endDate)).toBe("2024-06-16");
  });
});

describe("normalizeTimelineDateFieldsForRow", () => {
  it("writes min into start field and max into end when reversed", () => {
    const out = normalizeTimelineDateFieldsForRow(
      { a: "2024-12-31", b: "2024-01-01", x: 1 },
      "a",
      "b",
    );
    expect(out.a).toBe("2024-01-01");
    expect(out.b).toBe("2024-12-31");
    expect(out.x).toBe(1);
  });

  it("returns same reference when already ordered", () => {
    const row = { a: "2024-01-01", b: "2024-12-31" };
    const out = normalizeTimelineDateFieldsForRow(row, "a", "b");
    expect(out).toBe(row);
  });

  it("returns unchanged when end missing", () => {
    const row = { a: "2024-01-01" };
    const out = normalizeTimelineDateFieldsForRow(row, "a", "b");
    expect(out).toBe(row);
  });

  it("returns unchanged when either value is not a valid date", () => {
    const row = { a: "not-a-date", b: "2024-01-01" };
    const out = normalizeTimelineDateFieldsForRow(row, "a", "b");
    expect(out).toBe(row);
  });
});

function timelineTestItem(
  rowIndex: number,
  row: Record<string, unknown>,
  start: string,
  end: string,
  title: string,
): TimelineItem {
  return {
    row,
    rowIndex,
    startDate: new Date(start),
    endDate: new Date(end),
    title,
  };
}

describe("buildTimelineSwimlaneLanes", () => {
  it("uses a single lane when no swimlane field", () => {
    const lanes = buildTimelineSwimlaneLanes({
      swimlaneFieldId: undefined,
      resolvedOptions: [],
      timelineItems: [],
    });
    expect(lanes).toEqual([{ id: TIMELINE_ALL_LANE_ID, label: "All items" }]);
  });

  it("includes all resolved options plus Unassigned and unknown row keys", () => {
    const lanes = buildTimelineSwimlaneLanes({
      swimlaneFieldId: "status",
      resolvedOptions: [
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" },
      ],
      timelineItems: [
        timelineTestItem(
          0,
          { status: "orphan" },
          "2024-06-01",
          "2024-06-02",
          "X",
        ),
      ],
    });
    const ids = lanes.map((l) => l.id);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).toContain("");
    expect(ids).toContain("orphan");
  });
});

describe("assignStackLanesForItems", () => {
  it("stacks overlapping ranges into separate rows", () => {
    const a = timelineTestItem(0, {}, "2024-06-01", "2024-06-05", "A");
    const b = timelineTestItem(1, {}, "2024-06-03", "2024-06-08", "B");
    const c = timelineTestItem(2, {}, "2024-06-10", "2024-06-12", "C");
    const map = assignStackLanesForItems([a, b, c]);
    expect(map.get(0)?.stackIndex).toBe(0);
    expect(map.get(1)?.stackIndex).toBe(1);
    expect(map.get(2)?.stackIndex).toBe(0);
    expect(map.get(0)?.stackDepth).toBe(2);
  });
});

describe("computePlacedTimelineBars", () => {
  it("places items under the all-items lane when no swimlane field", () => {
    const items = [
      timelineTestItem(0, {}, "2024-06-01", "2024-06-02", "A"),
      timelineTestItem(1, {}, "2024-06-02", "2024-06-03", "B"),
    ];
    const lanes = buildTimelineSwimlaneLanes({
      swimlaneFieldId: undefined,
      resolvedOptions: [],
      timelineItems: items,
    });
    const placed = computePlacedTimelineBars(items, undefined, lanes);
    expect(placed.every((p) => p.swimlaneKey === TIMELINE_ALL_LANE_ID)).toBe(
      true,
    );
  });
});

describe("shiftTimelineStoredDateRangeByDays", () => {
  it("shifts both start and end by whole days", () => {
    const row = { start: "2024-01-01", end: "2024-01-05" };
    const out = shiftTimelineStoredDateRangeByDays(row, "start", "end", 2);
    expect(out).toEqual({ start: "2024-01-03", end: "2024-01-07" });
  });

  it("returns null for zero delta", () => {
    expect(
      shiftTimelineStoredDateRangeByDays(
        { start: "2024-01-01", end: "2024-01-02" },
        "start",
        "end",
        0,
      ),
    ).toBeNull();
  });
});
