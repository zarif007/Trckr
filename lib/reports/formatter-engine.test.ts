import { describe, expect, it } from "vitest";

import type { FormatterPlanV1 } from "./ast-schemas";
import { applyFormatterPlan, formatOutputMarkdown } from "./formatter-engine";

describe("applyFormatterPlan compute_column", () => {
  const rows: Record<string, unknown>[] = [
    { a: 10, b: 3, total: 100 },
    { a: 20, b: 5, total: 200 },
  ];

  it("binary subtract and multiply", () => {
    const plan: FormatterPlanV1 = {
      version: 1,
      outputStyle: "markdown_table",
      ops: [
        {
          op: "compute_column",
          name: "diff",
          expression: {
            kind: "binary",
            fn: "subtract",
            left: { path: "a" },
            right: { path: "b" },
          },
        },
        {
          op: "compute_column",
          name: "twice",
          expression: {
            kind: "binary",
            fn: "multiply",
            left: { path: "diff" },
            right: { num: 2 },
          },
        },
      ],
    };
    const out = applyFormatterPlan(rows, plan);
    expect(out[0]!.diff).toBe(7);
    expect(out[0]!.twice).toBe(14);
    expect(out[1]!.diff).toBe(15);
    expect(out[1]!.twice).toBe(30);
  });

  it("percent with default scale 100", () => {
    const plan: FormatterPlanV1 = {
      version: 1,
      outputStyle: "markdown_table",
      ops: [
        {
          op: "compute_column",
          name: "share",
          expression: {
            kind: "percent",
            part: { path: "a" },
            whole: { path: "total" },
          },
        },
      ],
    };
    const out = applyFormatterPlan(rows, plan);
    expect(out[0]!.share).toBe(10);
    expect(out[1]!.share).toBe(10);
  });

  it("divide by zero yields null", () => {
    const plan: FormatterPlanV1 = {
      version: 1,
      outputStyle: "markdown_table",
      ops: [
        {
          op: "compute_column",
          name: "bad",
          expression: {
            kind: "binary",
            fn: "divide",
            left: { num: 1 },
            right: { num: 0 },
          },
        },
      ],
    };
    const out = applyFormatterPlan([{ x: 1 }], plan);
    expect(out[0]!.bad).toBeNull();
  });
});

describe("formatOutputMarkdown auto-segmentation by __gridId", () => {
  const multiGridRows: Record<string, unknown>[] = [
    { __gridId: "grid-a", name: "Task 1", status: "done" },
    { __gridId: "grid-a", name: "Task 2", status: "pending" },
    { __gridId: "grid-b", name: "Project X", budget: 5000 },
    { __gridId: "grid-b", name: "Project Y", budget: 3000 },
  ];

  it("auto-segments rows with multiple __gridId values", () => {
    const result = formatOutputMarkdown(multiGridRows, "markdown_table");
    expect(result).toContain("### grid-a");
    expect(result).toContain("### grid-b");
  });

  it("does not segment when only one __gridId value", () => {
    const singleGrid = multiGridRows.map((r) => ({ ...r, __gridId: "only-grid" }));
    const result = formatOutputMarkdown(singleGrid, "markdown_table");
    expect(result).not.toContain("###");
    expect(result).toContain("| name |");
  });

  it("does not segment when __gridId is missing from rows", () => {
    const noGrid = [{ name: "A", value: 1 }, { name: "B", value: 2 }];
    const result = formatOutputMarkdown(noGrid, "markdown_table");
    expect(result).not.toContain("###");
  });

  it("explicit segmentBy overrides auto __gridId segmentation", () => {
    const result = formatOutputMarkdown(multiGridRows, "markdown_table", {
      segmentBy: "status",
    });
    expect(result).toContain("### done");
    expect(result).toContain("### pending");
    expect(result).not.toContain("### grid-a");
  });

  it("segmentBy __label overrides default __gridId segmentation", () => {
    const rowsWithLabel = multiGridRows.map((r, i) => ({
      ...r,
      __label: i % 2 === 0 ? "alpha" : "beta",
    }));
    const result = formatOutputMarkdown(rowsWithLabel, "markdown_table", {
      segmentBy: "__label",
    });
    expect(result).toContain("### alpha");
    expect(result).toContain("### beta");
    expect(result).not.toContain("### grid-a");
  });
});
