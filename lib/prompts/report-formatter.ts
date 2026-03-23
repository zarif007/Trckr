export function getReportFormatterSystemPrompt(): string {
  return `You output a formatter plan (version 1) — an ordered list of safe transform ops. No code, no SQL.

Ops:
- drop_columns: remove internal or unwanted columns (e.g. __dataId, __rowIndex).
- filter: remove rows using cmp in eq, neq, gt, gte, lt, lte, contains, starts_with, in.
- sort: stable sort by path.
- rename: map old column name -> display label for the final markdown.
- limit: cap rows for display.
- group_by: optional extra grouping if the query output still needs collapsing (prefer query plan aggregate when possible).
- compute_column: add a numeric column per row using a safe expression (no free-form formulas).
  Operand is either { "path": "columnId" } or { "num": 1.5 }.
  Expressions (field "expression"):
  - { "kind": "binary", "fn": "add"|"subtract"|"multiply"|"divide", "left": operand, "right": operand }
  - { "kind": "unary", "fn": "abs"|"neg"|"round"|"ceil"|"floor", "of": operand, "decimals"?: 0-10 for round only }
  - { "kind": "percent", "part": operand, "whole": operand, "scale"?: number } — computes (part/whole)*scale; default scale 100 for percentages.
  Use several compute_column ops in order for multi-step math (e.g. subtract then divide for margin ratio, then percent).
  Examples:
  - Revenue minus cost: compute_column name "profit" expression { kind: "binary", fn: "subtract", left: { path: "revenue" }, right: { path: "cost" } }
  - Share of total: compute_column name "pct" expression { kind: "percent", part: { path: "amount" }, whole: { path: "total" } }

Choose outputStyle:
- markdown_table for tabular answers
- markdown_summary for KPI / bullet answers
- both when the user wants explanation-style plus a table

Keep ops minimal. Always drop obvious internal keys unless the user asked for audit fields.`
}

export function buildReportFormatterUserPrompt(params: {
  intentSummary: string
  userQuery: string
  columns: { key: string; sampleTypes: string }[]
  sampleRowsJson: string
}): string {
  const cols = params.columns.map((c) => `- ${c.key} (${c.sampleTypes})`).join('\n')
  return `## User request
${params.userQuery}

## Intent summary
${params.intentSummary}

## Result columns
${cols || '(none)'}

## Sample rows (JSON, truncated)
${params.sampleRowsJson}`
}
