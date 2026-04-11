import { describe, expect, it } from "vitest";
import {
  buildBindingsFromSchema,
  getOptionGridLabelAndValueFieldIds,
} from "../schema-build";
import type { TrackerLike } from "../types";

describe("getOptionGridLabelAndValueFieldIds", () => {
  it("returns null when no layout nodes for grid", () => {
    expect(getOptionGridLabelAndValueFieldIds("g1", [])).toBeNull();
  });

  it("uses single field for both label and value when no legacy pair", () => {
    expect(
      getOptionGridLabelAndValueFieldIds("opt_grid", [
        { gridId: "opt_grid", fieldId: "name", order: 1 },
      ]),
    ).toEqual({ labelFieldId: "name", valueFieldId: "name" });
  });

  it("detects legacy _label and _value suffix pair", () => {
    expect(
      getOptionGridLabelAndValueFieldIds("opt_grid", [
        { gridId: "opt_grid", fieldId: "x_label", order: 2 },
        { gridId: "opt_grid", fieldId: "x_value", order: 1 },
      ]),
    ).toEqual({ labelFieldId: "x_label", valueFieldId: "x_value" });
  });
});

describe("buildBindingsFromSchema", () => {
  it("returns unchanged when fields array missing", () => {
    const t = { tabs: [], bindings: {} } as unknown as TrackerLike;
    expect(buildBindingsFromSchema(t)).toBe(t);
  });

  it("creates binding and master data scaffolding for options field in layout", () => {
    const tracker: TrackerLike = {
      masterDataScope: "tracker",
      tabs: [{ id: "main_tab", name: "Main" }],
      sections: [{ id: "sec1", tabId: "main_tab", name: "S" }],
      grids: [{ id: "grid1", sectionId: "sec1", name: "G", type: "table" }],
      fields: [
        { id: "title", dataType: "string", ui: { label: "T" } },
        { id: "status", dataType: "options", ui: { label: "Status" } },
      ],
      layoutNodes: [
        { gridId: "grid1", fieldId: "title", order: 1 },
        { gridId: "grid1", fieldId: "status", order: 2 },
      ],
      bindings: {},
    };
    const out = buildBindingsFromSchema(tracker);
    expect(out.bindings?.["grid1.status"]).toMatchObject({
      optionsGrid: "status_options_grid",
      labelField: "status_options_grid.status_option",
    });
    expect(out.grids?.some((g) => g.id === "status_options_grid")).toBe(true);
    expect(out.tabs?.some((t) => t.id === "master_data_tab")).toBe(true);
  });

  it("skips options fields when masterDataScope is not tracker", () => {
    const tracker: TrackerLike = {
      masterDataScope: "project",
      tabs: [{ id: "main_tab", name: "Main" }],
      sections: [{ id: "sec1", tabId: "main_tab", name: "S" }],
      grids: [{ id: "grid1", sectionId: "sec1", name: "G", type: "table" }],
      fields: [{ id: "status", dataType: "options", ui: { label: "S" } }],
      layoutNodes: [{ gridId: "grid1", fieldId: "status", order: 1 }],
      bindings: {},
    };
    const out = buildBindingsFromSchema(tracker);
    expect(out.bindings?.["grid1.status"]).toBeUndefined();
  });
});
