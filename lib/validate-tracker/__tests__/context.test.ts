import { describe, expect, it } from "vitest";
import { buildValidationContext } from "../context";
import type { TrackerLike } from "../types";

function baseTracker(overrides: Partial<TrackerLike> = {}): TrackerLike {
  return {
    tabs: [{ id: "tab1", name: "Main" }],
    sections: [{ id: "sec1", tabId: "tab1", name: "Section" }],
    grids: [{ id: "g1", sectionId: "sec1", name: "Grid", type: "table" }],
    fields: [
      { id: "a", dataType: "string", ui: { label: "A" } },
      { id: "b", dataType: "string", ui: { label: "B" } },
    ],
    layoutNodes: [
      { gridId: "g1", fieldId: "a", order: 1 },
      { gridId: "g1", fieldId: "b", order: 2 },
    ],
    bindings: {},
    ...overrides,
  };
}

describe("buildValidationContext", () => {
  it("includes fieldPaths only for layout nodes whose grid and field exist", () => {
    const ctx = buildValidationContext(
      baseTracker({
        layoutNodes: [
          { gridId: "g1", fieldId: "a", order: 1 },
          { gridId: "missing_grid", fieldId: "a", order: 2 },
          { gridId: "g1", fieldId: "missing_field", order: 3 },
        ],
      }),
    );
    expect(ctx.fieldPaths.has("g1.a")).toBe(true);
    expect(ctx.fieldPaths.has("missing_grid.a")).toBe(false);
    expect(ctx.fieldPaths.has("g1.missing_field")).toBe(false);
  });

  it("normalizes missing collections to empty arrays and objects", () => {
    const ctx = buildValidationContext({
      tabs: [{ id: "t1", name: "T" }],
      sections: [{ id: "s1", tabId: "t1", name: "S" }],
      grids: [{ id: "g1", sectionId: "s1", name: "G", type: "table" }],
      fields: [{ id: "f1", dataType: "string", ui: {} }],
    });
    expect(ctx.layoutNodes).toEqual([]);
    expect(ctx.bindings).toEqual({});
    expect(ctx.validations).toEqual({});
    expect(ctx.calculations).toEqual({});
    expect(ctx.dynamicOptions).toEqual({});
  });
});
