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
- filter paths: catalog field ids or __createdAt / __updatedAt / __gridId / __label / __dataId.
- **sort:** use intent + generation plan to implement user-requested ordering (multiple sort keys allowed).
- **aggregate:** groupBy + metrics for rollups; groupBy paths are flattened field ids or meta keys when specified.
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

  return `## Field catalog
${params.catalogText}

## Original user request
${params.userQuery}

## ${branchRule}

## Data plan (internal — implement exactly)
${formatGenerationPlanForPrompt(params.intent.generationPlan)}

## Parsed intent (JSON)
${JSON.stringify(params.intent, null, 2)}`
}
