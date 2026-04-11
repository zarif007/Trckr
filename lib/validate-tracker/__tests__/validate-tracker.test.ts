import { describe, expect, it } from "vitest";
import { validateTracker } from "../index";
import type { TrackerLike } from "../types";

function tableTracker(overrides: Partial<TrackerLike> = {}): TrackerLike {
  return {
    tabs: [{ id: "tab1", name: "Main" }],
    sections: [{ id: "sec1", tabId: "tab1", name: "Section" }],
    grids: [{ id: "g1", sectionId: "sec1", name: "Grid", type: "table" }],
    fields: [{ id: "sku", dataType: "string", ui: { label: "SKU" } }],
    layoutNodes: [{ gridId: "g1", fieldId: "sku", order: 1 }],
    bindings: {},
    ...overrides,
  };
}

describe("validateTracker", () => {
  it("treats null and undefined as valid", () => {
    expect(validateTracker(null)).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
    expect(validateTracker(undefined)).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it("flags layoutNode with missing grid", () => {
    const r = validateTracker(
      tableTracker({
        layoutNodes: [{ gridId: "no_such_grid", fieldId: "sku", order: 1 }],
      }),
    );
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('missing gridId "no_such_grid"'))).toBe(
      true,
    );
  });

  it("flags layoutNode with missing field", () => {
    const r = validateTracker(
      tableTracker({
        layoutNodes: [{ gridId: "g1", fieldId: "ghost", order: 1 }],
      }),
    );
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('missing fieldId "ghost"'))).toBe(true);
  });

  it("flags section referencing missing tab", () => {
    const r = validateTracker(
      tableTracker({
        sections: [{ id: "sec1", tabId: "missing_tab", name: "S" }],
      }),
    );
    expect(r.valid).toBe(false);
    expect(
      r.errors.some((e) => e.includes('missing tabId "missing_tab"')),
    ).toBe(true);
  });

  it("flags grid referencing missing section", () => {
    const r = validateTracker(
      tableTracker({
        grids: [{ id: "g1", sectionId: "no_sec", name: "G", type: "table" }],
      }),
    );
    expect(r.valid).toBe(false);
    expect(
      r.errors.some((e) => e.includes('missing sectionId "no_sec"')),
    ).toBe(true);
  });

  it("warns when options field in layout has no binding", () => {
    const r = validateTracker(
      tableTracker({
        fields: [{ id: "status", dataType: "options", ui: { label: "S" } }],
        layoutNodes: [{ gridId: "g1", fieldId: "status", order: 1 }],
        bindings: {},
      }),
    );
    expect(r.valid).toBe(true);
    expect(
      r.warnings.some((w) =>
        w.includes('has no bindings entry; run buildBindingsFromSchema'),
      ),
    ).toBe(true);
  });

  it("errors when validations key is not gridId.fieldId", () => {
    const r = validateTracker(
      tableTracker({
        validations: {
          sku: [{ type: "expr", expr: { op: "const", value: 1 } }],
        } as TrackerLike["validations"],
      }),
    );
    expect(r.valid).toBe(false);
    expect(
      r.errors.some((e) =>
        e.includes('validations key "sku" must be "gridId.fieldId"'),
      ),
    ).toBe(true);
  });

  it("errors when validation expr uses bare field id", () => {
    const r = validateTracker(
      tableTracker({
        validations: {
          "g1.sku": [
            {
              type: "expr",
              expr: { op: "field", fieldId: "sku" },
            },
          ],
        },
      }),
    );
    expect(r.valid).toBe(false);
    expect(
      r.errors.some((e) => e.includes("not bare fieldId")),
    ).toBe(true);
  });

  it("errors when calculations key is not gridId.fieldId", () => {
    const r = validateTracker(
      tableTracker({
        calculations: {
          total: { expr: { op: "const", value: 1 } },
        } as TrackerLike["calculations"],
      }),
    );
    expect(r.valid).toBe(false);
    expect(
      r.errors.some((e) =>
        e.includes('calculations key "total" must be "gridId.fieldId"'),
      ),
    ).toBe(true);
  });

  it("errors on calculation dependency cycle", () => {
    const r = validateTracker(
      tableTracker({
        fields: [
          { id: "a", dataType: "number", ui: { label: "A" } },
          { id: "b", dataType: "number", ui: { label: "B" } },
        ],
        layoutNodes: [
          { gridId: "g1", fieldId: "a", order: 1 },
          { gridId: "g1", fieldId: "b", order: 2 },
        ],
        calculations: {
          "g1.a": { expr: { op: "field", fieldId: "g1.b" } },
          "g1.b": { expr: { op: "field", fieldId: "g1.a" } },
        },
      }),
    );
    expect(r.valid).toBe(false);
    expect(
      r.errors.some((e) => e.includes("dependency cycle")),
    ).toBe(true);
  });

  it("errors when calculation field references another grid", () => {
    const r = validateTracker(
      tableTracker({
        grids: [
          { id: "g1", sectionId: "sec1", name: "G1", type: "table" },
          { id: "g2", sectionId: "sec1", name: "G2", type: "table" },
        ],
        fields: [
          { id: "x", dataType: "number", ui: { label: "X" } },
          { id: "y", dataType: "number", ui: { label: "Y" } },
        ],
        layoutNodes: [
          { gridId: "g1", fieldId: "x", order: 1 },
          { gridId: "g2", fieldId: "y", order: 1 },
        ],
        calculations: {
          "g1.x": { expr: { op: "field", fieldId: "g2.y" } },
        },
      }),
    );
    expect(r.valid).toBe(false);
    expect(
      r.errors.some((e) => e.includes('must stay within target grid "g1"')),
    ).toBe(true);
  });

  it("allows accumulate to reference another grid path", () => {
    const r = validateTracker(
      tableTracker({
        grids: [
          { id: "g1", sectionId: "sec1", name: "Main", type: "table" },
          { id: "g2", sectionId: "sec1", name: "Lines", type: "table" },
        ],
        fields: [
          { id: "total", dataType: "number", ui: { label: "Total" } },
          { id: "amt", dataType: "number", ui: { label: "Amt" } },
        ],
        layoutNodes: [
          { gridId: "g1", fieldId: "total", order: 1 },
          { gridId: "g2", fieldId: "amt", order: 1 },
        ],
        calculations: {
          "g1.total": {
            expr: {
              op: "accumulate",
              sourceFieldId: "g2.amt",
              action: "add",
            },
          },
        },
      }),
    );
    expect(
      r.errors.filter((e) => e.includes("must stay within target grid")),
    ).toEqual([]);
  });
});
