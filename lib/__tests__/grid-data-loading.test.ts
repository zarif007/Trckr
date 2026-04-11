import { describe, expect, it } from "vitest";
import {
  assertSafeJsonPathKey,
  effectiveKanbanPageSize,
  effectivePaginatedPageSize,
  getGridDataLoadingMode,
  isGridDataPaginated,
  isOptionsGridId,
  listPaginatedGridSlugs,
} from "@/lib/grid-data-loading";
import type { TrackerGrid } from "@/app/components/tracker-display/types";

describe("assertSafeJsonPathKey", () => {
  it("accepts field-like ids", () => {
    expect(() => assertSafeJsonPathKey("status")).not.toThrow();
    expect(() => assertSafeJsonPathKey("field_1")).not.toThrow();
    expect(() => assertSafeJsonPathKey("clxxxxxxxxxxxxxxxx")).not.toThrow();
  });

  it("rejects injection-prone keys", () => {
    expect(() => assertSafeJsonPathKey("'; DROP TABLE")).toThrow();
    expect(() => assertSafeJsonPathKey("")).toThrow();
    expect(() => assertSafeJsonPathKey("a".repeat(200))).toThrow();
  });
});

describe("isGridDataPaginated / listPaginatedGridSlugs", () => {
  it("defaults to snapshot when no row-backed grid surface", () => {
    const g = { id: "g1", name: "", sectionId: "", placeId: 0 } as TrackerGrid;
    expect(isGridDataPaginated(g)).toBe(false);
    expect(listPaginatedGridSlugs([g])).toEqual([]);
  });

  it("defaults to snapshot for calendar view when mode omitted", () => {
    const g: TrackerGrid = {
      id: "events",
      name: "Events",
      sectionId: "s",
      placeId: 0,
      views: [{ id: "c1", name: "Calendar", type: "calendar", config: {} }],
    };
    expect(getGridDataLoadingMode(g)).toBe("snapshot");
    expect(isGridDataPaginated(g)).toBe(false);
    expect(listPaginatedGridSlugs([g])).toEqual([]);
  });

  it("defaults to snapshot for timeline view when mode omitted", () => {
    const g: TrackerGrid = {
      id: "roadmap",
      name: "Roadmap",
      sectionId: "s",
      placeId: 0,
      views: [{ id: "tl1", name: "Timeline", type: "timeline", config: {} }],
    };
    expect(getGridDataLoadingMode(g)).toBe("snapshot");
    expect(isGridDataPaginated(g)).toBe(false);
    expect(listPaginatedGridSlugs([g])).toEqual([]);
  });

  it("keeps calendar and timeline snapshot-backed unless explicitly paginated", () => {
    const calendar: TrackerGrid = {
      id: "events",
      name: "Events",
      sectionId: "s",
      placeId: 0,
      views: [{ id: "c1", name: "Calendar", type: "calendar", config: {} }],
    };
    const timeline: TrackerGrid = {
      id: "roadmap",
      name: "Roadmap",
      sectionId: "s",
      placeId: 0,
      views: [{ id: "tl1", name: "Timeline", type: "timeline", config: {} }],
    };
    const explicitTimeline: TrackerGrid = {
      ...timeline,
      id: "roadmap_paginated",
      config: { dataLoading: { mode: "paginated" } },
    };

    expect(listPaginatedGridSlugs([calendar, timeline, explicitTimeline])).toEqual(
      ["roadmap_paginated"],
    );
  });

  it("defaults to paginated for table view when mode omitted", () => {
    const g: TrackerGrid = {
      id: "tasks",
      name: "Tasks",
      sectionId: "s",
      placeId: 0,
      views: [{ id: "t1", name: "Table", type: "table", config: {} }],
    };
    expect(getGridDataLoadingMode(g)).toBe("paginated");
    expect(isGridDataPaginated(g)).toBe(true);
    expect(listPaginatedGridSlugs([g])).toEqual(["tasks"]);
  });

  it("defaults to paginated when table and calendar share one grid (calendar uses row API)", () => {
    const g: TrackerGrid = {
      id: "tasks",
      name: "Tasks",
      sectionId: "s",
      placeId: 0,
      views: [
        { id: "t1", name: "Table", type: "table", config: {} },
        { id: "c1", name: "Calendar", type: "calendar", config: {} },
      ],
    };
    expect(isGridDataPaginated(g)).toBe(true);
    expect(listPaginatedGridSlugs([g])).toEqual(["tasks"]);
  });

  it("defaults to paginated for kanban view when mode omitted", () => {
    const g: TrackerGrid = {
      id: "tasks",
      name: "Tasks",
      sectionId: "s",
      placeId: 0,
      views: [
        {
          id: "k1",
          name: "Kanban",
          type: "kanban",
          config: { groupBy: "status" },
        },
      ],
    };
    expect(isGridDataPaginated(g)).toBe(true);
  });

  it("keeps snapshot for options grids even with a table view", () => {
    const g: TrackerGrid = {
      id: "priority_options_grid",
      name: "Priority options",
      sectionId: "s",
      placeId: 0,
      views: [{ id: "o1", name: "Table", type: "table", config: {} }],
    };
    expect(isOptionsGridId(g.id)).toBe(true);
    expect(isGridDataPaginated(g)).toBe(false);
  });

  it("respects explicit snapshot on a table grid", () => {
    const g: TrackerGrid = {
      id: "tasks",
      name: "Tasks",
      sectionId: "s",
      placeId: 0,
      views: [{ id: "t1", name: "Table", type: "table", config: {} }],
      config: { dataLoading: { mode: "snapshot" } },
    };
    expect(isGridDataPaginated(g)).toBe(false);
  });

  it("detects explicit paginated config", () => {
    const g: TrackerGrid = {
      id: "tasks",
      name: "Tasks",
      sectionId: "s",
      placeId: 0,
      config: { dataLoading: { mode: "paginated" } },
    };
    expect(isGridDataPaginated(g)).toBe(true);
    expect(listPaginatedGridSlugs([g])).toEqual(["tasks"]);
  });
});

describe("effectiveKanbanPageSize", () => {
  it("matches table page size when kanbanPageSize is omitted", () => {
    const g: TrackerGrid = {
      id: "tasks",
      name: "Tasks",
      sectionId: "s",
      placeId: 0,
      config: { pageSize: 25 },
      views: [{ id: "k1", name: "Kanban", type: "kanban", config: {} }],
    };
    expect(effectivePaginatedPageSize(g)).toBe(25);
    expect(effectiveKanbanPageSize(g)).toBe(25);
  });

  it("uses kanbanPageSize override when set", () => {
    const g: TrackerGrid = {
      id: "tasks",
      name: "Tasks",
      sectionId: "s",
      placeId: 0,
      config: {
        pageSize: 25,
        dataLoading: { kanbanPageSize: 12 },
      },
      views: [{ id: "k1", name: "Kanban", type: "kanban", config: {} }],
    };
    expect(effectiveKanbanPageSize(g)).toBe(12);
  });
});
