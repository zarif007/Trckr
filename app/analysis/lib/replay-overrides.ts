import type { QueryPlanV1 } from "@/lib/insights-query/schemas";
import type { ReplayQueryOverrides } from "@/lib/insights-query/query-plan-overrides";

export type FilterRowDraft = {
  path: string;
  op: QueryPlanV1["filter"][number]["op"];
  valueRaw: string;
};

export function parseFilterValueRaw(raw: string): unknown {
  const t = raw.trim();
  if (t === "") return "";
  if (t === "true") return true;
  if (t === "false") return false;
  const n = Number(t);
  if (t !== "" && !Number.isNaN(n) && String(n) === t) return n;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return raw;
  }
}

export function filterValueToRaw(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function buildReplayQueryOverrides(params: {
  rowTimeFilter: QueryPlanV1["load"]["rowTimeFilter"] | null;
  filterRows: FilterRowDraft[];
  queryPlan: QueryPlanV1;
  aggregateGroupBy: string[];
}): ReplayQueryOverrides {
  const { rowTimeFilter, filterRows, queryPlan, aggregateGroupBy } = params;
  const o: ReplayQueryOverrides = {
    load: { rowTimeFilter: rowTimeFilter === null ? null : rowTimeFilter },
    filter: filterRows
      .filter((r) => r.path.trim() !== "")
      .map((r) => ({
        path: r.path.trim(),
        op: r.op,
        value: parseFilterValueRaw(
          r.valueRaw,
        ) as QueryPlanV1["filter"][number]["value"],
      })),
  };
  if (queryPlan.aggregate) {
    o.aggregateGroupBy = aggregateGroupBy;
  }
  return o;
}

export function filterDraftFromQueryPlan(plan: QueryPlanV1): {
  rowTimeFilter: QueryPlanV1["load"]["rowTimeFilter"] | null;
  filterRows: FilterRowDraft[];
  aggregateGroupBy: string[];
} {
  return {
    rowTimeFilter: plan.load.rowTimeFilter ?? null,
    filterRows: plan.filter.map((f) => ({
      path: f.path,
      op: f.op,
      valueRaw: filterValueToRaw(f.value),
    })),
    aggregateGroupBy: plan.aggregate?.groupBy ?? [],
  };
}
