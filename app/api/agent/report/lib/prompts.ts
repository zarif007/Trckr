/**
 * System and user prompt builders for the report generation agent pipeline.
 * Each agent receives focused instructions and the context it needs.
 */

import {
  formatGenerationPlanForPrompt,
  type ReportGenerationPlan,
} from "@/lib/reports/report-schemas";

// ─── Architect Agent ───────────────────────────────────────────────────────────

export function getArchitectSystemPrompt(params: {
  trackerInstance: "SINGLE" | "MULTI";
  versionControl: boolean;
}): string {
  const dataSource = (() => {
    if (params.trackerInstance === "MULTI") {
      return `- **Data source:** MULTI tracker — include rows from **all instances** (each TrackerData row is one instance). After flatten, instance identity is \`__label\` / \`__dataId\`. Grand totals need **sum**/**avg** on real numeric catalog fields, not row counts.`;
    }
    if (params.versionControl) {
      return `- **Data source:** SINGLE tracker with **version control** — default to **main branch only** (omit load.branchName unless explicitly requested).`;
    }
    return `- **Data source:** SINGLE tracker **without** version control — standard TrackerData rows (main branch).`;
  })();

  const instancePlan =
    params.trackerInstance === "MULTI"
      ? `
- **generationPlan.instancePolicy:** \`combined_all\` = one table of pooled rows; \`per_instance_breakdown\` = keep or group by \`__label\` / \`__dataId\`; \`filter_specific_instance\` = user named one instance; \`not_applicable\` only if the request ignores instance identity.
- **MULTI — totals vs counts:** *total*, *volume*, *amount*, *sum*, *combined*, *how much* (money/units) → **metrics** must use **aggregation \`sum\`** (or \`avg\`) on a catalog field whose **type** is \`number\`/ \`currency\` — **never count**. Count is only for "how many rows/entries/records".
- **MULTI — detail vs rollup:** *Show/list/all rows/every line/breakdown* → **aggregation \`none\`** on metrics and **outputStyle** \`table\` so the query returns detail rows, not a single aggregate row.`
      : `
- Set **generationPlan.instancePolicy** to \`not_applicable\`.`;

  return `You map a user's natural-language request into a **structured data specification** for a report.

A report is **only curated tabular data** (what to load, filter, aggregate, sort)—not commentary, objectives, or analysis for the reader.

Output one object matching the schema. Rules:
- **narrative:** one short technical line for logs (e.g. "Tasks filtered status≠done, sorted by due date").
- **generationPlan (required):** Internal pipeline contract—never user-facing prose.
 - **objectives:** terse bullets of **what data** must appear (fields, filters, aggregates)—short technical phrases.
 - **keyComparisons:** group-by dimensions, sort keys, multi-grid / multi-instance layout hints.
 - **formatterGuidance:** layout only: column order, renames, outputStyle (markdown_table vs markdown_summary), and when to set **segmentMarkdownTablesByColumn**.
 - **caveats:** leave empty unless an internal constraint matters.
- **filters.fieldPath:** catalog field ids only (not __label); instance filters belong in the query plan.
${dataSource}
${instancePlan}
- gridIds: exact ids from the catalog; [] = all grids.
- timeRange: align with user wording; applyToRow defaults to createdAt unless the user asks about updates.
- metrics aggregation "none" = detail rows, not rollups.
- For line totals (qty × price), name both field ids in metrics so the query plan can use an expression aggregate.
- outputStyle: table for tabular data; summary only for a single-row KPI set; prefer one clean table.`;
}

export function buildArchitectUserPrompt(params: {
  userQuery: string;
  catalogText: string;
  trackerInstance: "SINGLE" | "MULTI";
  versionControl: boolean;
}): string {
  const vc = params.versionControl ? "version control: on" : "version control: off";
  const inst = params.trackerInstance === "MULTI" ? "MULTI (all instances)" : "SINGLE";

  return `## Field catalog
${params.catalogText}

## Tracker
- Instance mode: **${inst}**
- ${vc}

## User request
${params.userQuery}

Map this request into the structured data specification.`;
}

export function buildArchitectMinimalPrompt(userQuery: string): string {
  return `Extract the data requirements from this request: ${userQuery}`;
}

// ─── Query Agent ───────────────────────────────────────────────────────────────

export function getQuerySystemPrompt(): string {
  return `You build a versioned JSON query plan (version must be 1). This is the executable **data access spec** over the tracker store.

The executor:
1. Loads TrackerData rows for the tracker schema.
2. Filters by branchName and row createdAt/updatedAt via load.rowTimeFilter.
3. Flattens grid rows into records with __dataId, __label, __branchName, __createdAt, __gridId, plus field ids.
4. Applies filter clauses on flattened paths.
5. Optionally aggregates (groupBy + metrics).
6. Sorts and limits.

Rules:
- load.maxTrackerDataRows: 1–5000 (default **500**; raise to **2000-5000** for MULTI pooled sum/avg across many instances).
- load.branchName: **omit** = **main only**. null = all branches. String = named branch.
- flatten.gridIds: from intent; [] = auto-discover grids with row arrays.
- **Paths:** Prefer **catalog field ids** for filter, sort, aggregate groupBy, and metric **path** values. Use **__createdAt** / **__updatedAt** only when the user scopes data by row time. Use **__gridId** only when multiple grids matter. Use **__branchName** only for non-default branch.
- **Instance identity (__label / __dataId):** Use **only** when generationPlan.instancePolicy is \`per_instance_breakdown\` or \`filter_specific_instance\`, or the user explicitly names instances. For \`combined_all\` or \`not_applicable\`, do not group/sort/filter on instance columns.
- **Totals vs count:** *total volume/amount/sum/combined* → use **sum** (or **avg**) on the numeric catalog **path**, with **groupBy: []** for one grand-total row. Use **count** only for "how many rows/entries".
- **Monetary "total value":** sum of (quantity × unit price) via metric **expression**, not sum(unit_price).
- Each sum/avg/min/max metric has exactly one of path or expression; count has neither.
- **Detail rows:** If intent metrics use **aggregation "none"** or the user asked to *see/list* rows, **omit aggregate**.
- Never output SQL or JavaScript—only this JSON AST.
- Follow the **generation plan** for instance pooling vs per-instance columns and for which grids/dimensions matter.`;
}

export function buildQueryUserPrompt(params: {
  intent: unknown;
  catalogText: string;
  userQuery: string;
  trackerInstance: "SINGLE" | "MULTI";
  versionControl: boolean;
}): string {
  const branchRule =
    params.versionControl && params.trackerInstance === "SINGLE"
      ? "Branch rule: default **main** only (omit load.branchName)."
      : params.trackerInstance === "MULTI"
        ? "Instance rule: load across instances; raise load.maxTrackerDataRows for grand totals."
        : "Single tracker, no version control: main branch rows.";

  const intent = params.intent as Record<string, unknown>;
  const genPlan = intent?.generationPlan as Record<string, unknown> | undefined;
  const instancePolicy = genPlan?.instancePolicy ?? "not_applicable";
  const instanceRule = `**generationPlan.instancePolicy**: \`${instancePolicy}\``;

  const genPlanFormatted = genPlan
    ? formatGenerationPlanForPrompt(genPlan as ReportGenerationPlan)
    : "(no internal data plan — infer from intent and user request)";

  return `## Field catalog
${params.catalogText}

## Original user request
${params.userQuery}

## ${branchRule}

## ${instanceRule}

## Data plan (internal — implement exactly)
${genPlanFormatted}

## Parsed intent (JSON)
${JSON.stringify(params.intent, null, 2)}

Build the query plan AST that will execute this request.`;
}

export function buildQueryMinimalPrompt(userQuery: string): string {
  return `Build a query plan for: ${userQuery}. Use an empty groupBy, simple filter if needed, and limit 100 rows.`;
}

// ─── Calc Agent ────────────────────────────────────────────────────────────────

export function getCalcSystemPrompt(): string {
  return `You are the calculation planner for a tracker report pipeline.

The query step has already produced a row table with concrete columns. Your job is to list **additional per-row columns** that should be computed (references to flattened field paths, arithmetic, conditionals).

Rules:
- Return **columns: []** when the existing output already satisfies the user. Do not invent busywork.
- Only suggest columns the user clearly needs: line totals (qty × price), margin %, conditional adjustments, derived scores, etc.
- Each column needs a **unique snake_case name** and a short **instruction** the expression generator will use.
- At most 6 columns. Prefer fewer.
- Do not duplicate a column that already exists with the same meaning.
- Instructions must reference **column keys** as they appear in the column list. Reference \`__label\` / \`__dataId\` **only** when instancePolicy is \`per_instance_breakdown\` and those columns are present.`;
}

export function buildCalcUserPrompt(params: {
  intentSummary: string;
  userQuery: string;
  columnKeys: string[];
  sampleRowsJson: string;
  generationPlan?: ReportGenerationPlan;
}): string {
  const cols =
    params.columnKeys.length > 0
      ? params.columnKeys.map((k) => `- ${k}`).join("\n")
      : "(no columns)";

  return `User request (verbatim): ${params.userQuery}

Intent summary: ${params.intentSummary}

## Generation plan (must follow)
${formatGenerationPlanForPrompt(params.generationPlan)}

Current columns after the query plan:
${cols}

Sample rows (JSON, up to 15):
${params.sampleRowsJson}

Return which derived columns to add before formatting, or an empty list if none are needed.`;
}

export function getCalcExprSystemPrompt(): string {
  return `You generate a single per-row expression AST for a report-derived column.

The expression system supports:
- **field** (reference another column by path)
- **const** (literal number)
- **add**, **sub**, **mul**, **div**, **mod**, **pow** (binary arithmetic)
- **sum** (aggregate over rows — use only when aggregating)
- **if**, **eq**, **neq**, **gt**, **gte**, **lt**, **lte**, **and**, **or**, **not** (conditionals)
- **abs**, **round**, **floor**, **ceil**, **clamp** (numeric transforms)
- **concat**, **trim**, **toUpper**, **toLower**, **length**, **includes**, **slice** (string ops)

Rules:
- Reference only columns that exist in the provided list.
- Output a single JSON expression node. No markdown, no code blocks.
- Do not invent operators not in the list above.`;
}

export function buildCalcExprUserPrompt(params: {
  columnName: string;
  instruction: string;
  availableColumns: string[];
}): string {
  return `Generate an expression for column "${params.columnName}".

Instruction: ${params.instruction}

Available columns: ${params.availableColumns.join(", ")}

Output the expression as a JSON AST.`;
}

// ─── Formatter Agent ───────────────────────────────────────────────────────────

export function getFormatterSystemPrompt(): string {
  return `You output a formatter plan (version 1): **data presentation only**—transform ops, no commentary, no assumptions spelled out for the reader.

The final markdown is **tables and/or compact KPI lines**, not objectives, notes, or narrative analysis.

Top-level fields:
- **outputStyle:** markdown_table for tabular data; markdown_summary only when the result is effectively one aggregate row; avoid "both" unless the user explicitly wanted a tiny KPI block plus a detail table.
- **segmentMarkdownTablesByColumn:** optional. Set to \`__gridId\` when multiple grids should appear as **separate tables**. Set to \`__label\` **only** when instancePolicy is \`per_instance_breakdown\` or the user asked for one table per instance. Omit for a single combined table.
- **ops:** ordered transforms.

Ops:
- drop_columns: remove internal keys the user did not ask for (\`__dataId\`, \`__rowIndex\`, \`__branchName\`). Prefer dropping \`__label\` / \`__dataId\` unless instancePolicy is \`per_instance_breakdown\`.
- filter, sort, rename, limit, group_by, compute_column: standard ops.
- Use **rename** for clear column headers.

Do **not** add prose that explains caveats, objectives, or methodology.`;
}

export function buildFormatterUserPrompt(params: {
  intentSummary: string;
  userQuery: string;
  columns: { key: string; sampleTypes: string }[];
  sampleRowsJson: string;
  generationPlan?: ReportGenerationPlan;
}): string {
  const cols = params.columns
    .map((c) => `- ${c.key} (${c.sampleTypes})`)
    .join("\n");

  return `## User request
${params.userQuery}

## Technical summary (internal)
${params.intentSummary}

## Data layout plan (internal — implement; do not repeat as prose in output)
${formatGenerationPlanForPrompt(params.generationPlan)}

## Result columns
${cols || "(none)"}

## Sample rows (JSON, truncated)
${params.sampleRowsJson}`;
}
