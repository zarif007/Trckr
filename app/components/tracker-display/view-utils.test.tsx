import { describe, expect, it } from "vitest";
import type { TrackerGrid } from "./types";
import { normalizeGridViews } from "./view-utils";

describe("normalizeGridViews", () => {
  it("uses explicit views when present", () => {
    const grid = {
      id: "g1",
      name: "Tasks",
      sectionId: "s1",
      placeId: 1,
      views: [
        { id: "v1", type: "kanban" as const, name: "Board", config: { groupBy: "status" } },
      ],
    } satisfies TrackerGrid;
    const views = normalizeGridViews(grid);
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      id: "v1",
      type: "kanban",
      name: "Board",
      config: { groupBy: "status" },
    });
  });

  it("falls back to legacy grid.type when views empty", () => {
    const grid: TrackerGrid = {
      id: "g2",
      name: "List",
      sectionId: "s1",
      placeId: 2,
      type: "table",
      config: { isRowAddAble: false },
    };
    const views = normalizeGridViews(grid);
    expect(views[0]?.type).toBe("table");
    expect(views[0]?.config).toEqual({ isRowAddAble: false });
    expect(views[0]?.id).toBe("g2_table_view_0");
  });

  it("defaults to table when no views and no type", () => {
    const grid: TrackerGrid = {
      id: "g3",
      name: "X",
      sectionId: "s1",
      placeId: 3,
    };
    const views = normalizeGridViews(grid);
    expect(views[0]?.type).toBe("table");
  });
});
