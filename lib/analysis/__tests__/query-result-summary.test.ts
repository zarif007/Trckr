import { describe, expect, it } from "vitest";

import { buildNumericColumnSummaries } from "../query-result-summary";

describe("buildNumericColumnSummaries", () => {
  it("returns empty for no rows", () => {
    expect(buildNumericColumnSummaries([])).toEqual([]);
  });

  it("summarizes numeric columns", () => {
    const rows = [
      { a: 1, b: "x", __id: "1" },
      { a: 3, b: "y", __id: "2" },
      { a: 2, b: "z", __id: "3" },
    ];
    const s = buildNumericColumnSummaries(rows);
    const a = s.find((x) => x.key === "a");
    expect(a).toBeDefined();
    expect(a!.min).toBe(1);
    expect(a!.max).toBe(3);
    expect(a!.sum).toBe(6);
    expect(a!.numericCount).toBe(3);
  });

  it("skips columns with too few numeric values", () => {
    const rows = [
      { a: 1, b: "nope" },
      { a: 2, b: "nah" },
      { a: null, b: "x" },
    ];
    const s = buildNumericColumnSummaries(rows);
    expect(s.find((x) => x.key === "b")).toBeUndefined();
  });
});
