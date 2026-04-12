import { describe, it, expect } from "vitest";
import {
  buildKanbanGroupColumnDescriptors,
  fieldHasNonEmptyResolvedOptions,
} from "../kanban-column-discovery";

describe("buildKanbanGroupColumnDescriptors", () => {
  const fid = "status";

  it("uses resolved options exclusively when non-empty", () => {
    const { columns, discoveryPending } = buildKanbanGroupColumnDescriptors({
      groupByFieldId: fid,
      resolvedOptions: [
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" },
      ],
      rows: [{ [fid]: "ghost" }],
      serverDistinctValues: ["x"],
      distinctValuesLoading: true,
    });
    expect(discoveryPending).toBe(false);
    expect(columns.map((c) => c.id)).toEqual(["a", "b", ""]);
  });

  it("returns empty columns while distinct loading with no local or server values", () => {
    const { columns, discoveryPending } = buildKanbanGroupColumnDescriptors({
      groupByFieldId: "name",
      resolvedOptions: [],
      rows: [],
      serverDistinctValues: [],
      distinctValuesLoading: true,
    });
    expect(discoveryPending).toBe(true);
    expect(columns).toEqual([]);
  });

  it("merges row and server distinct values", () => {
    const { columns, discoveryPending } = buildKanbanGroupColumnDescriptors({
      groupByFieldId: "name",
      resolvedOptions: [],
      rows: [{ name: "  Ada " }, { name: "Bob" }],
      serverDistinctValues: ["Bob", "Cara"],
      distinctValuesLoading: false,
    });
    expect(discoveryPending).toBe(false);
    expect(columns.map((c) => c.id).sort()).toEqual(["", "Ada", "Bob", "Cara"]);
  });

  it("dedupes duplicate ids", () => {
    const { columns } = buildKanbanGroupColumnDescriptors({
      groupByFieldId: "x",
      resolvedOptions: [],
      rows: [{ x: "Same" }, { x: "Same" }],
      serverDistinctValues: ["Same"],
      distinctValuesLoading: false,
    });
    const ids = columns.map((c) => c.id).filter(Boolean);
    expect(ids).toEqual(["Same"]);
  });
});

describe("fieldHasNonEmptyResolvedOptions", () => {
  it("is false for a plain string field with no binding options", () => {
    expect(
      fieldHasNonEmptyResolvedOptions(
        "tab",
        "grid1",
        { id: "title", dataType: "string" },
        {},
        { grid1: [{ title: "a" }] },
        undefined,
      ),
    ).toBe(false);
  });
});
