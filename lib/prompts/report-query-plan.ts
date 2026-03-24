import { formatGenerationPlanForPrompt, type ReportIntent } from '@/lib/reports/report-schemas'

export function getReportQueryPlanSystemPrompt(): string {
  return `You build a versioned JSON query plan (version must be 1). This is the executable **data access spec** (same role as SQL over our store): load rows, filter, flatten grids, aggregate, sort, limit.

The executor:
1. Loads TrackerData rows for the tracker (JSON "data": grid id -> array of row objects with field ids as keys).
2. Filters by branchName and row createdAt/updatedAt via load.rowTimeFilter.
3. Flattens grid rows into records with __dataId, __label, __branchName, __createdAt, __gridId, plus field ids.
4. Applies filter clauses on flattened paths.
5. Optionally aggregates (groupBy + metrics).
6. Sorts and limits.

Rules:
- load.maxTrackerDataRows: 1–500 (default 500 unless fewer is clearly enough).
- load.branchName: **omit** = **main only**. Use **null** only when the user explicitly wants all branches. Use a string for a named branch.
- flatten.gridIds: from intent; [] = auto-discover grids with row arrays.
- **Paths (default to catalog):** Prefer **catalog field ids** for filter, sort, aggregate groupBy, and metric **path** values. Use row timestamps **__createdAt** / **__updatedAt** only when the user or generation plan scopes data by row time. Use **__gridId** only when multiple grids matter (separate segments or grid-specific filters). Use **__branchName** only when the user asked for a non-default branch.
- **Instance identity (__label / __dataId):** Use **only** when the parsed intent’s **generationPlan.instancePolicy** is \`per_instance_breakdown\` or \`filter_specific_instance\`, or the user explicitly names or compares tracker instances. For \`combined_all\`, \`not_applicable\`, or pooled MULTI tables, do **not** group, sort, or filter on \`__label\` / \`__dataId\` unless the user explicitly required instance columns.
- **sort:** use intent + generation plan to implement user-requested ordering (multiple sort keys allowed).
- **aggregate:** groupBy + metrics for rollups; groupBy should use catalog field ids unless instancePolicy or the user requires \`__label\` / \`__dataId\` / \`__gridId\`.
- **Critical — monetary "total value":** sum of (quantity × unit price) per line via metric **expression**, not sum(unit_price).
- Each sum/avg/min/max metric has exactly one of path or expression; count has neither.
- Never output SQL or JavaScript strings—only this JSON AST.
- Follow the **generation plan** for instance pooling vs per-instance columns and for which grids/dimensions matter.`
}

export function buildReportQueryPlanUserPrompt(params: {
  intent: ReportIntent
  catalogText: string
  userQuery: string
  trackerInstance: 'SINGLE' | 'MULTI'
  versionControl: boolean
}): string {
  const branchRule =
    params.versionControl && params.trackerInstance === 'SINGLE'
      ? 'Branch rule: default **main** only (omit load.branchName). Use null only if the user asked for all branches.'
      : params.trackerInstance === 'MULTI'
        ? 'Instance rule: load across instances; branch default remains main per row unless user asked otherwise.'
        : 'Single tracker, no version control: main branch rows.'

  const instanceRule = `**generationPlan.instancePolicy** (must follow for __label / __dataId): \`${params.intent.generationPlan.instancePolicy}\``

  return `## Field catalog
${params.catalogText}

## Original user request
${params.userQuery}

## ${branchRule}

## ${instanceRule}

## Data plan (internal — implement exactly)
${formatGenerationPlanForPrompt(params.intent.generationPlan)}

## Parsed intent (JSON)
${JSON.stringify(params.intent, null, 2)}`
}
