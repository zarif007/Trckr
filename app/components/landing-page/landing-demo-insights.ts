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

/** Static rows matching the demo plan (high-priority deals, grouped by status). */
export const LANDING_DEMO_REPORT_ROWS: Record<string, unknown>[] = [
  {
    'project_list.project_status': 'In Progress',
    sum_budget: 10200,
    deal_count: 1,
  },
  {
    'project_list.project_status': 'Blocked',
    sum_budget: 5400,
    deal_count: 1,
  },
]

export const LANDING_DEMO_REPORT_MARKDOWN = `**High-priority pipeline** — same query-plan + table stack as product reports. Filter recipe is read-only here; sign in to run live generation.`

export const LANDING_DEMO_ANALYSIS_DOCUMENT: AnalysisDocumentV1 = {
  version: 1,
  blocks: [
    {
      sectionId: 'landing-demo-1',
      title: 'Where high-priority budget sits',
      markdown:
        'Two **High** priority projects account for the spend below. This block uses the same **Analysis** renderer as the app (markdown + chart).',
      chartSpec: { type: 'bar', xKey: 'status', yKeys: ['budget'] },
      chartData: [
        { status: 'In Progress', budget: 10200 },
        { status: 'Blocked', budget: 5400 },
      ],
      sources: 'Demo snapshot · 2 rows · priority = High',
    },
  ],
}
