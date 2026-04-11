import { describe, expect, it } from "vitest";
import { enrichBindingsFromSchema } from "../enrich";
import type { TrackerLike } from "../types";

function base(): TrackerLike {
  return {
    tabs: [],
    sections: [],
    grids: [
      { id: "main", sectionId: "s", name: "Main", type: "table" },
      { id: "color_options_grid", sectionId: "s", name: "Opts", type: "table" },
    ],
    fields: [],
    layoutNodes: [
      { gridId: "main", fieldId: "color", order: 1 },
      { gridId: "main", fieldId: "price", order: 2 },
      { gridId: "main", fieldId: "sku", order: 3 },
      { gridId: "color_options_grid", fieldId: "color_option", order: 1 },
      { gridId: "color_options_grid", fieldId: "opt_price", order: 2 },
    ],
    bindings: {
      "main.color": {
        optionsGrid: "color_options_grid",
        labelField: "color_options_grid.color_option",
        fieldMappings: [
          {
            from: "color_options_grid.color_option",
            to: "main.color",
          },
        ],
      },
    },
  };
}

describe("enrichBindingsFromSchema", () => {
  it("returns same reference when bindings missing", () => {
    const t: TrackerLike = { ...base(), bindings: undefined };
    expect(enrichBindingsFromSchema(t as TrackerLike)).toBe(t);
  });

  it("adds exact id mapping when no other rule already targets that main field", () => {
    const tracker = base();
    tracker.layoutNodes = tracker.layoutNodes!.filter(
      (n) => !(n.gridId === "color_options_grid" && n.fieldId === "opt_price"),
    );
    tracker.layoutNodes!.push({
      gridId: "color_options_grid",
      fieldId: "sku",
      order: 3,
    });
    const out = enrichBindingsFromSchema(tracker);
    const maps = out.bindings!["main.color"]!.fieldMappings ?? [];
    expect(
      maps.some((m) => m.from === "color_options_grid.sku" && m.to === "main.sku"),
    ).toBe(true);
  });

  it("adds prefix match optField === selectField_mainField", () => {
    const tracker = base();
    tracker.layoutNodes = tracker.layoutNodes!.filter(
      (n) => !(n.gridId === "color_options_grid" && n.fieldId === "opt_price"),
    );
    tracker.layoutNodes!.push({
      gridId: "color_options_grid",
      fieldId: "color_sku",
      order: 4,
    });
    const out = enrichBindingsFromSchema(tracker);
    const maps = out.bindings!["main.color"]!.fieldMappings ?? [];
    expect(
      maps.some(
        (m) =>
          m.from === "color_options_grid.color_sku" && m.to === "main.sku",
      ),
    ).toBe(true);
  });

  it("adds suffix match optField ends with _mainFieldId", () => {
    const tracker = base();
    const out = enrichBindingsFromSchema(tracker);
    const maps = out.bindings!["main.color"]!.fieldMappings ?? [];
    expect(
      maps.some(
        (m) => m.from === "color_options_grid.opt_price" && m.to === "main.price",
      ),
    ).toBe(true);
  });

  it("does not remove existing mappings", () => {
    const tracker = base();
    tracker.bindings!["main.color"]!.fieldMappings = [
      ...(tracker.bindings!["main.color"]!.fieldMappings ?? []),
      { from: "x", to: "y" },
    ];
    const out = enrichBindingsFromSchema(tracker);
    expect(out.bindings!["main.color"]!.fieldMappings?.some((m) => m.from === "x")).toBe(
      true,
    );
  });
});
