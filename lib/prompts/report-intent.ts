export function getReportIntentSystemPrompt(): string {
  return `You are an analyst assistant. The user describes what they want from a tracker (tabular business data stored as JSON per tracker row).

Output a single structured object matching the schema. Rules:
- fieldPath values must match field ids from the catalog (not display labels).
- gridIds: use exact grid ids from the catalog; [] means include every grid that has table rows.
- filters: only include filters the user clearly asked for; use concrete values when you can infer them (e.g. status equals "done").
- timeRange.kind "relative" with preset when the user mentions last week/month; "absolute" with fromIso/toIso only if they give explicit dates (ISO-8601).
- timeRange.applyToRow: prefer createdAt unless they ask about updates.
- metrics with aggregation "none" mean they want raw rows/columns, not a rollup.
- For **total inventory or line value** (quantity × unit price), mention both field ids in metrics or narrative so the query plan can use an expression aggregate (sum of products), not summing unit_price alone.
- outputStyle: table for comparisons; summary for single KPIs; both when they want narrative plus a table.`
}

export function buildReportIntentUserPrompt(params: {
  userQuery: string
  catalogText: string
}): string {
  return `## Field catalog
${params.catalogText}

## User request
${params.userQuery}`
}
