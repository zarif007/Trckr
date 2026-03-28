import type { AvailableField } from '@/app/components/tracker-display/edit-mode/expr/expr-types'
import type { AnalysisDocumentV1 } from '@/lib/analysis/analysis-schemas'
import type { ExprNode } from '@/lib/functions/types'
import type { QueryPlanV1 } from '@/lib/reports/ast-schemas'

/** Matches `FieldCatalogEntry` in ReportRecipeFilters (kept local so this module stays data-only). */
export type LandingDemoFieldCatalogEntry = {
  fieldId: string
  label: string
  gridId: string
  gridName: string
  dataType: string
}

/** Same shape as the Logic tab line-total calculation — drives the visual AST builder. */
export const LANDING_DEMO_INITIAL_EXPR: ExprNode = {
  op: 'mul',
  args: [
    { op: 'field', fieldId: 'logic_lines_grid.logic_qty' },
    { op: 'field', fieldId: 'logic_lines_grid.logic_unit_rate' },
  ],
}

export const LANDING_DEMO_EXPR_FIELDS: AvailableField[] = [
  { fieldId: 'logic_lines_grid.logic_qty', label: 'Qty', dataType: 'number' },
  { fieldId: 'logic_lines_grid.logic_unit_rate', label: 'Unit ($)', dataType: 'number' },
  { fieldId: 'logic_lines_grid.logic_line_total', label: 'Line total', dataType: 'number' },
  { fieldId: 'project_list.project_est_hours', label: 'Est. hours', dataType: 'number' },
  { fieldId: 'project_list.project_hourly_rate', label: 'Rate ($/hr)', dataType: 'number' },
  { fieldId: 'project_list.project_budget', label: 'Est. budget', dataType: 'number' },
]

/** Saved-style query plan shown read-only in Report filters (aligned with pipeline demo). */
export const LANDING_DEMO_QUERY_PLAN: QueryPlanV1 = {
  version: 1,
  load: {
    maxTrackerDataRows: 500,
    rowTimeFilter: { field: 'updatedAt', preset: 'last_30_days' },
  },
  flatten: { gridIds: ['project_list'] },
  filter: [{ path: 'project_list.project_priority', op: 'eq', value: 'High' }],
  aggregate: {
    groupBy: ['project_list.project_status'],
    metrics: [
      { name: 'sum_budget', op: 'sum', path: 'project_list.project_budget' },
      { name: 'deal_count', op: 'count' },
    ],
  },
  sort: [{ path: 'project_list.project_status', direction: 'asc' }],
}

export const LANDING_DEMO_FIELD_CATALOG: LandingDemoFieldCatalogEntry[] = [
  {
    fieldId: 'project_list.project_name',
    label: 'Project',
    gridId: 'project_list',
    gridName: 'Projects',
    dataType: 'string',
  },
  {
    fieldId: 'project_list.project_owner',
    label: 'Owner',
    gridId: 'project_list',
    gridName: 'Projects',
    dataType: 'string',
  },
  {
    fieldId: 'project_list.project_status',
    label: 'Status',
    gridId: 'project_list',
    gridName: 'Projects',
    dataType: 'options',
  },
  {
    fieldId: 'project_list.project_priority',
    label: 'Priority',
    gridId: 'project_list',
    gridName: 'Projects',
    dataType: 'options',
  },
  {
    fieldId: 'project_list.project_budget',
    label: 'Est. budget',
    gridId: 'project_list',
    gridName: 'Projects',
    dataType: 'number',
  },
]

/** Total High-priority budget across the two demo rows (10200 + 5400). */
const LANDING_DEMO_HIGH_PRIORITY_BUDGET_TOTAL = 15600

/** Static rows matching the demo plan (high-priority deals, grouped by status). */
export const LANDING_DEMO_REPORT_ROWS: Record<string, unknown>[] = [
  {
    'project_list.project_status': 'In Progress',
    sum_budget: 10200,
    deal_count: 1,
    pipeline_share: 10200 / LANDING_DEMO_HIGH_PRIORITY_BUDGET_TOTAL,
  },
  {
    'project_list.project_status': 'Blocked',
    sum_budget: 5400,
    deal_count: 1,
    pipeline_share: 5400 / LANDING_DEMO_HIGH_PRIORITY_BUDGET_TOTAL,
  },
]

export const LANDING_DEMO_REPORT_MARKDOWN = `**High-priority pipeline snapshot** — This recipe lines up with the **Pipeline** tab in the tracker demo: filter to **Priority = High**, flatten the **Projects** grid, then **sum Est. budget** grouped by **Status**. The read-only recipe below and the results table use the same stack as product reports.

- **In Progress** holds most of the committed budget; **Blocked** is the rest — a good prompt to unblock or re-scope work sitting idle.

**Total** High-priority budget in this snapshot: **$15,600** (two projects). Sign in to run live generation and edit recipes.`

export const LANDING_DEMO_ANALYSIS_DOCUMENT: AnalysisDocumentV1 = {
  version: 1,
  blocks: [
    {
      sectionId: 'landing-demo-1',
      title: 'Where high-priority budget sits',
      markdown:
        'Two **High** priority projects from the pipeline demo — *New onboarding flow* and *Laptop refresh Q1* — account for the spend below. This block uses the same **Analysis** renderer as the app (markdown plus chart).',
      chartSpec: { type: 'bar', xKey: 'status', yKeys: ['budget'] },
      chartData: [
        { status: 'In Progress', budget: 10200 },
        { status: 'Blocked', budget: 5400 },
      ],
      sources: 'Demo snapshot · 2 rows · priority = High',
    },
    {
      sectionId: 'landing-demo-2',
      title: 'Suggested next steps',
      markdown:
        '1. **Review Blocked work** — *Laptop refresh Q1* carries meaningful budget; confirm owners and dates or move status if it is a false positive.\n2. **Protect In Progress capacity** — *New onboarding flow* is the larger line; keep scope stable until the milestone in the tracker demo passes.\n3. **Re-run after edits** — When you change pipeline rows or priorities, regenerate the report and analysis so charts stay tied to live data.',
      sources: 'Demo narrative · aligned with Project pipeline demo rows',
    },
  ],
}
