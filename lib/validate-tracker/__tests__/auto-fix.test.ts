import { describe, expect, it } from "vitest";
import { autoFixBindings } from "../auto-fix";
import { validateTracker } from "../index";
import type { TrackerLike } from "../types";

function optionsTracker(): TrackerLike {
  return {
    masterDataScope: "tracker",
    tabs: [{ id: "tab1", name: "Main" }],
    sections: [{ id: "sec1", tabId: "tab1", name: "Section" }],
    grids: [{ id: "main", sectionId: "sec1", name: "Main", type: "table" }],
    fields: [
      { id: "title", dataType: "string", ui: { label: "Title" } },
      { id: "cat", dataType: "options", ui: { label: "Category" } },
    ],
    layoutNodes: [
      { gridId: "main", fieldId: "title", order: 1 },
      { gridId: "main", fieldId: "cat", order: 2 },
    ],
    bindings: {},
  };
}

describe("autoFixBindings", () => {
  it("does not mutate the input tracker", () => {
    const input = optionsTracker();
    const snapshot = JSON.stringify(input);
    autoFixBindings(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("adds binding and option grid for options field when scope is tracker", () => {
    const fixed = autoFixBindings(optionsTracker());
    expect(fixed.bindings?.["main.cat"]).toBeDefined();
    expect(fixed.bindings?.["main.cat"]?.optionsGrid).toBe("cat_options_grid");
    expect(fixed.grids?.some((g) => g.id === "cat_options_grid")).toBe(true);
    const v = validateTracker(fixed);
    expect(
      v.warnings.filter((w) => w.includes("has no bindings entry")),
    ).toHaveLength(0);
  });

  it("is idempotent for bindings presence", () => {
    const once = autoFixBindings(optionsTracker());
    const twice = autoFixBindings(once);
    expect(twice.bindings?.["main.cat"]).toEqual(once.bindings?.["main.cat"]);
    expect(twice.grids?.length).toBe(once.grids?.length);
  });

  it("skips adding option infrastructure when masterDataScope is not tracker", () => {
    const input = { ...optionsTracker(), masterDataScope: "project" as const };
    const fixed = autoFixBindings(input);
    expect(fixed.bindings?.["main.cat"]).toBeUndefined();
  });
});
