export function getReportIntentSystemPrompt(params: {
  trackerInstance: 'SINGLE' | 'MULTI'
  versionControl: boolean
}): string {
  const dataSource = (() => {
    if (params.trackerInstance === 'MULTI') {
      return `- **Data source:** MULTI tracker — include rows from **all instances** (each TrackerData row is one instance). Loading may use fair per-instance caps; grand totals need **sum**/**avg** on real numeric catalog fields, not row counts. After flatten, instance identity is \`__label\` / \`__dataId\` when needed for grouping or filters.`
    }
    if (params.versionControl) {
      return `- **Data source:** SINGLE tracker with **version control** — default to **main branch only** (omit load.branchName in the query plan unless the user explicitly asks for other branches or all branches).`
    }
    return `- **Data source:** SINGLE tracker **without** version control — standard TrackerData rows (main branch).`
  })()

  const instancePlan =
    params.trackerInstance === 'MULTI'
      ? `
- **generationPlan.instancePolicy:** \`combined_all\` = one table of pooled rows; \`per_instance_breakdown\` = keep or group by \`__label\` / \`__dataId\`; \`filter_specific_instance\` = user named one instance; \`not_applicable\` only if the request ignores instance identity entirely.
- Put grouping/sorting needs in **groupByFieldPaths**, **metrics**, and **generationPlan.keyComparisons** (technical phrases). For multiple grids in one report, mention \`__gridId\` in keyComparisons so the formatter can set segmentMarkdownTablesByColumn.
- **MULTI — totals vs counts:** Phrases like *total*, *volume*, *amount*, *sum*, *combined*, *how much* (money/units) → set **metrics** with **aggregation \`sum\`** (or \`avg\`) on the matching catalog field whose **type** is \`number\`, \`currency\`, or similar—not **\`count\`**. **\`count\`** is only for “how many rows/entries/records/instances” when the user wants cardinality.
- **MULTI — detail vs rollup:** *Show/list/all rows/every line/breakdown* (without asking for one KPI number) → **aggregation \`none\`** on line-level metrics and **outputStyle** \`table\` so the query returns detail rows, not a single aggregate row.`
      : `
- Set **generationPlan.instancePolicy** to \`not_applicable\`.`

  return `You map a user's natural-language request into a **structured data specification** for a report.

A report is **only curated tabular data** (what to load, filter, aggregate, sort)—not commentary, objectives, or analysis for the reader.

Output one object matching the schema. Rules:
- **narrative:** one short technical line for logs (e.g. "Tasks filtered status≠done, sorted by due date").
- **generationPlan (required):** Internal pipeline contract only—never user-facing prose.
  - **objectives:** terse bullets of **what data** must appear (fields, filters, counts)—not "why" or interpretive goals.
  - **keyComparisons:** group-by dimensions, sort keys, multi-grid / multi-instance layout hints.
  - **formatterGuidance:** layout only: column order, renames, outputStyle (markdown_table vs markdown_summary vs both), and when to set **segmentMarkdownTablesByColumn** to \`__gridId\` (separate table per grid) or \`__label\` (per instance).
  - **caveats:** leave empty unless an internal constraint matters for the query plan; never surface to the user.
- **filters.fieldPath:** catalog field ids only (not __label); instance filters belong in the query plan via filter paths, guided by keyComparisons / instancePolicy.
${dataSource}
${instancePlan}
- gridIds: exact ids from the catalog; [] = all grids with row arrays.
- timeRange: align with user wording; applyToRow defaults to createdAt unless they ask about updates.
- **Catalog types:** The field catalog lists \`type=\` per field. Prefer **\`sum\`/\`avg\`** only on fields that are numeric in the catalog; never sum text fields.
- metrics aggregation "none" = detail rows, not rollups.
- For line totals (qty × price), name both field ids in metrics so the query plan can use an expression aggregate.
- outputStyle: table for tabular data; summary only for a single-row KPI set; both rarely—prefer one clean table.`
}

export function buildReportIntentUserPrompt(params: {
  userQuery: string
  catalogText: string
  trackerInstance: 'SINGLE' | 'MULTI'
  versionControl: boolean
}): string {
  const vc = params.versionControl ? 'version control: on' : 'version control: off'
  const inst = params.trackerInstance === 'MULTI' ? 'MULTI (all instances)' : 'SINGLE'
  return `## Field catalog
${params.catalogText}

## Tracker
- Instance mode: **${inst}**
- ${vc}

## User request (produce the data they asked for—no extra analysis)
${params.userQuery}

## Reminder
Use each field’s \`type=\` from the catalog when choosing **sum** vs **count** vs **none**.`
}
