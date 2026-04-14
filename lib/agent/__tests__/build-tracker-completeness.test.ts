import { describe, expect, it } from "vitest";

import { buildCompletenessGapMessages } from "../build-tracker-completeness";
import type { ManagerSchema } from "@/lib/schemas/multi-agent";

function managerWithTodos(count: number): ManagerSchema {
  return {
    builderTodo: Array.from({ length: count }, (_, i) => ({
      task: `Task ${i}`,
      target: "grid",
      action: "create",
    })),
  };
}

describe("buildCompletenessGapMessages", () => {
  it("flags low grid count for large builderTodo", () => {
    const gaps = buildCompletenessGapMessages(managerWithTodos(14), {
      tabs: [],
      sections: [],
      grids: [{ id: "g" }],
      fields: [],
      layoutNodes: [],
      bindings: {},
    } as Record<string, unknown>);

    expect(gaps.some((g) => g.includes("grid"))).toBe(true);
  });

  it("flags missing binding for options field with layout", () => {
    const manager: ManagerSchema = { builderTodo: [] };
    const gaps = buildCompletenessGapMessages(manager, {
      tabs: [{ id: "overview_tab", name: "O", placeId: 0, config: {} }],
      sections: [
        {
          id: "s_section",
          name: "S",
          tabId: "overview_tab",
          placeId: 0,
          config: {},
        },
      ],
      grids: [
        {
          id: "tasks_grid",
          name: "T",
          sectionId: "s_section",
          placeId: 0,
          config: {},
          views: [],
        },
      ],
      fields: [
        {
          id: "status",
          dataType: "options",
          ui: { label: "Status" },
          config: {},
        },
      ],
      layoutNodes: [{ gridId: "tasks_grid", fieldId: "status", order: 0 }],
      bindings: {},
    } as Record<string, unknown>);

    expect(
      gaps.some((g) => g.includes("bindings") || g.includes("binding")),
    ).toBe(true);
  });

  it("uses buildManifest when tab count is below expected", () => {
    const manager: ManagerSchema = {
      buildManifest: { tabIds: ["a_tab", "b_tab", "c_tab"] },
      builderTodo: [],
    };
    const gaps = buildCompletenessGapMessages(manager, {
      tabs: [{ id: "a_tab", name: "A", placeId: 0, config: {} }],
      sections: [],
      grids: [],
      fields: [],
      layoutNodes: [],
      bindings: {},
    } as Record<string, unknown>);

    expect(gaps.some((g) => g.includes("tab"))).toBe(true);
  });
});
