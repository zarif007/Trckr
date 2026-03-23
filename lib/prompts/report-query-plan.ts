import type { ReportIntent } from '@/lib/reports/ast-schemas'

export function getReportQueryPlanSystemPrompt(): string {
  return `You build a versioned JSON query plan (version must be 1) for reading tracker rows from the database.

The executor:
1. Loads TrackerData rows for the tracker (JSON "data" has keys = grid ids, values = arrays of row objects with field ids as keys).
2. Optionally filters by branchName and row createdAt/updatedAt using load.rowTimeFilter.
3. Flattens grid rows into records with keys like __dataId, __label, __createdAt, __gridId, plus each field id from the grid row.
4. Applies filter clauses on flattened paths (field ids or meta keys like __createdAt).
5. Optionally aggregates with groupBy + metrics.
6. Sorts and limits.

Rules:
- load.maxTrackerDataRows: cap between 1 and 500 (default 500 unless user needs fewer).
- load.branchName: omit field for default "main" only; null means all branches; string filters to that branch.
- flatten.gridIds: use intent.gridIds; if empty, use [] (means auto-discover).
- filter paths use flattened keys (field ids from catalog, or __createdAt / __updatedAt / __gridId / __label).
- For time windows, set load.rowTimeFilter with field + preset or explicit from/to ISO strings aligned with the intent.
- aggregate: use when intent asks for totals, averages, counts by group. groupBy uses flattened field ids.
- **Critical — monetary or “total value” metrics:** “Total value”, “inventory value”, “revenue”, “extended price”, etc. means **sum of (quantity × unit price) per line**, NOT sum(unit_price) and NOT sum(quantity) alone. Use a metric with **expression** (not path):
  - Example total value: \`{ "name": "total_value", "op": "sum", "expression": { "kind": "binary", "fn": "multiply", "left": { "path": "quantity" }, "right": { "path": "unit_price" } } } \`
  - Use field ids from the catalog (e.g. quantity, unit_price) — match actual flattened column names.
- For simple totals on one numeric column only, use **path** (e.g. sum of quantity: \`{ "name": "total_qty", "op": "sum", "path": "quantity" }\`).
- Each sum/avg/min/max metric must have **exactly one** of \`path\` or \`expression\`; \`count\` uses neither (row count in group).
- Never output SQL or JavaScript.`
}

export function buildReportQueryPlanUserPrompt(params: {
  intent: ReportIntent
  catalogText: string
  userQuery: string
}): string {
  return `## Field catalog
${params.catalogText}

## Original user request
${params.userQuery}

## Parsed intent (JSON)
${JSON.stringify(params.intent, null, 2)}`
}
