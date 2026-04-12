import { describe, it, expect } from "vitest";
import type { TrackerField } from "../../types";
import {
  computeDataGridViewPatchAfterFieldAdd,
  defaultViewConfigForNewDataGrid,
} from "../apply-add-layout-field";

describe("computeDataGridViewPatchAfterFieldAdd", () => {
  it("sets dateField on calendar when missing", () => {
    const patch = computeDataGridViewPatchAfterFieldAdd(
      "calendar",
      {},
      { id: "d1", dataType: "date" },
    );
    expect(patch).toEqual({ dateField: "d1" });
  });

  it("sets titleField on calendar for string when title missing", () => {
    const patch = computeDataGridViewPatchAfterFieldAdd(
      "calendar",
      { dateField: "d1" },
      { id: "t1", dataType: "string" },
    );
    expect(patch).toEqual({ titleField: "t1" });
  });

  it("sets endDateField on timeline when dateField already set", () => {
    const patch = computeDataGridViewPatchAfterFieldAdd(
      "timeline",
      { dateField: "s1" },
      { id: "e1", dataType: "date" },
    );
    expect(patch).toEqual({ endDateField: "e1" });
  });

  it("sets groupBy for kanban status when unset", () => {
    const patch = computeDataGridViewPatchAfterFieldAdd(
      "kanban",
      {},
      { id: "st", dataType: "status" },
    );
    expect(patch).toEqual({ groupBy: "st" });
  });

  it("sets groupBy for kanban when first column is string", () => {
    const patch = computeDataGridViewPatchAfterFieldAdd(
      "kanban",
      {},
      { id: "t1", dataType: "string" },
    );
    expect(patch).toEqual({ groupBy: "t1" });
  });
});

describe("defaultViewConfigForNewDataGrid", () => {
  it("returns groupBy for kanban when a status field exists", () => {
    const c = defaultViewConfigForNewDataGrid("kanban", [
      { id: "x", dataType: "status", ui: { label: "S" } },
    ] as TrackerField[]);
    expect(c.groupBy).toBe("x");
  });

  it("returns groupBy for kanban from first field when no select-like field", () => {
    const c = defaultViewConfigForNewDataGrid("kanban", [
      { id: "t", dataType: "string", ui: { label: "Title" } },
    ] as TrackerField[]);
    expect(c.groupBy).toBe("t");
  });

  it("returns dateField for calendar when a date field exists", () => {
    const c = defaultViewConfigForNewDataGrid("calendar", [
      { id: "due", dataType: "date", ui: { label: "Due" } },
    ] as TrackerField[]);
    expect(c.dateField).toBe("due");
  });

  it("returns dateField and endDateField for timeline when two date fields exist", () => {
    const c = defaultViewConfigForNewDataGrid("timeline", [
      { id: "s", dataType: "date", ui: { label: "Start" } },
      { id: "e", dataType: "date", ui: { label: "End" } },
    ] as TrackerField[]);
    expect(c.dateField).toBe("s");
    expect(c.endDateField).toBe("e");
  });
});
