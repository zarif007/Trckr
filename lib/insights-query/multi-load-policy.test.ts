import { describe, expect, it } from "vitest";

import { needsMultiFairPoolForAggregates } from "./multi-load-policy";
import type { QueryPlanV1 } from "./schemas";

describe("needsMultiFairPoolForAggregates", () => {
  it("is true for global sum (empty groupBy)", () => {
    const plan: QueryPlanV1 = {
      version: 1,
      load: { maxTrackerDataRows: 500 },
      flatten: { gridIds: ["g"] },
      filter: [],
      sort: [],
      aggregate: {
        groupBy: [],
        metrics: [{ name: "t", op: "sum", path: "amount" }],
      },
    };
    expect(needsMultiFairPoolForAggregates(plan)).toBe(true);
  });

  it("is true for global avg", () => {
    const plan: QueryPlanV1 = {
      version: 1,
      load: { maxTrackerDataRows: 500 },
      flatten: { gridIds: ["g"] },
      filter: [],
      sort: [],
      aggregate: {
        groupBy: [],
        metrics: [{ name: "a", op: "avg", path: "amount" }],
      },
    };
    expect(needsMultiFairPoolForAggregates(plan)).toBe(true);
  });

  it("is false when groupBy is non-empty", () => {
    const plan: QueryPlanV1 = {
      version: 1,
      load: { maxTrackerDataRows: 500 },
      flatten: { gridIds: ["g"] },
      filter: [],
      sort: [],
      aggregate: {
        groupBy: ["region"],
        metrics: [{ name: "t", op: "sum", path: "amount" }],
      },
    };
    expect(needsMultiFairPoolForAggregates(plan)).toBe(false);
  });

  it("is false for global count-only rollup", () => {
    const plan: QueryPlanV1 = {
      version: 1,
      load: { maxTrackerDataRows: 500 },
      flatten: { gridIds: ["g"] },
      filter: [],
      sort: [],
      aggregate: {
        groupBy: [],
        metrics: [{ name: "n", op: "count" }],
      },
    };
    expect(needsMultiFairPoolForAggregates(plan)).toBe(false);
  });

  it("is false when aggregate is omitted", () => {
    const plan: QueryPlanV1 = {
      version: 1,
      load: { maxTrackerDataRows: 500 },
      flatten: { gridIds: ["g"] },
      filter: [],
      sort: [],
    };
    expect(needsMultiFairPoolForAggregates(plan)).toBe(false);
  });
});
