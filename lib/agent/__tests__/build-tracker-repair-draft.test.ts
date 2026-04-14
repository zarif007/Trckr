import { describe, expect, it } from "vitest";

import { summarizeTrackerDraftForRepairPrompt } from "../build-tracker-repair-draft";

describe("summarizeTrackerDraftForRepairPrompt", () => {
  it("returns empty for null", () => {
    expect(summarizeTrackerDraftForRepairPrompt(null, 100)).toBe("");
  });

  it("truncates long JSON", () => {
    const draft: Record<string, unknown> = {
      tabs: [{ id: "a".repeat(5000) }],
      sections: [],
      grids: [],
      fields: [],
      layoutNodes: [],
      bindings: {},
    };
    const out = summarizeTrackerDraftForRepairPrompt(draft, 80);
    expect(out.length).toBeLessThanOrEqual(80 + "\n…[truncated]".length);
    expect(out).toContain("truncated");
  });
});
