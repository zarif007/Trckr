import { buildLandingDemoGridData } from '@/app/components/landing-page/landing-demo-schema'
import {
  executeQueryPlan,
  type TrackerDataInput,
} from '@/lib/insights-query/query-executor'
import type { QueryPlanV1 } from '@/lib/reports/ast-schemas'

/** Fixed “as of” for marketing analysis headers (matches synthetic tracker row). */
export const LANDING_DEMO_SNAPSHOT_AS_OF_ISO = '2026-03-15T14:30:00.000Z'

export function buildSyntheticLandingTrackerRows(): TrackerDataInput[] {
  const data = buildLandingDemoGridData()
  return [
    {
      id: 'landing-demo-snapshot',
      label: 'Northwind GTM — FY26 plan',
      branchName: 'main',
      createdAt: new Date('2026-01-08T10:00:00.000Z'),
      updatedAt: new Date(LANDING_DEMO_SNAPSHOT_AS_OF_ISO),
      data: data as Record<string, unknown>,
    },
  ]
}

/**
 * Executable plan aligned with `executeQueryPlan`: bare field paths on flattened
 * `project_list` rows (same convention as `buildFieldCatalog` / report prompts).
 */
export const LANDING_DEMO_QUERY_PLAN: QueryPlanV1 = {
  version: 1,
  load: {
    maxTrackerDataRows: 500,
    rowTimeFilter: { field: 'updatedAt', preset: 'last_30_days' },
  },
  flatten: { gridIds: ['project_list'] },
  filter: [
    { path: 'project_priority', op: 'in', value: ['High', 'Medium'] },
    { path: 'project_status', op: 'neq', value: 'Completed' },
  ],
  aggregate: {
    groupBy: ['project_status'],
    metrics: [
      { name: 'sum_budget', op: 'sum', path: 'project_budget' },
      { name: 'deal_count', op: 'count' },
      { name: 'avg_rate', op: 'avg', path: 'project_hourly_rate' },
      { name: 'max_budget', op: 'max', path: 'project_budget' },
    ],
  },
  sort: [{ path: 'project_status', direction: 'asc' }],
}

function addPipelineShare(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  let total = 0
  for (const r of rows) {
    const v = r.sum_budget
    if (typeof v === 'number' && Number.isFinite(v)) total += v
  }
  if (total <= 0) return rows.map((r) => ({ ...r, pipeline_share: 0 }))
  return rows.map((r) => {
    const v = r.sum_budget
    const share = typeof v === 'number' && Number.isFinite(v) ? v / total : 0
    return { ...r, pipeline_share: share }
  })
}

export function buildLandingDemoReportRows(): Record<string, unknown>[] {
  const raw = executeQueryPlan(buildSyntheticLandingTrackerRows(), LANDING_DEMO_QUERY_PLAN)
  return addPipelineShare(raw)
}

const _landingDemoReportRows = buildLandingDemoReportRows()

export const LANDING_DEMO_REPORT_ROWS: Record<string, unknown>[] = _landingDemoReportRows

export const LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET = _landingDemoReportRows.reduce(
  (sum, r) => {
    const v = r.sum_budget
    return sum + (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  },
  0,
)

export const LANDING_DEMO_REPORT_FILTERED_DEAL_COUNT = _landingDemoReportRows.reduce(
  (sum, r) => {
    const v = r.deal_count
    return sum + (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  },
  0,
)

/** Sum of Est. budget for High-priority rows in the same filtered cohort (for pie / copy). */
export const LANDING_DEMO_REPORT_HIGH_PRIORITY_BUDGET = (() => {
  const rows = executeQueryPlan(buildSyntheticLandingTrackerRows(), {
    ...LANDING_DEMO_QUERY_PLAN,
    aggregate: {
      groupBy: [],
      metrics: [
        {
          name: 'high_budget',
          op: 'sum',
          path: 'project_budget',
        },
      ],
    },
    filter: [
      ...LANDING_DEMO_QUERY_PLAN.filter,
      { path: 'project_priority', op: 'eq', value: 'High' },
    ],
    sort: [],
  })
  const v = rows[0]?.high_budget
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
})()

/** Sum of Est. budget for Medium-priority rows in the filtered cohort. */
export const LANDING_DEMO_REPORT_MEDIUM_PRIORITY_BUDGET = (() => {
  const rows = executeQueryPlan(buildSyntheticLandingTrackerRows(), {
    ...LANDING_DEMO_QUERY_PLAN,
    aggregate: {
      groupBy: [],
      metrics: [
        {
          name: 'medium_budget',
          op: 'sum',
          path: 'project_budget',
        },
      ],
    },
    filter: [
      ...LANDING_DEMO_QUERY_PLAN.filter,
      { path: 'project_priority', op: 'eq', value: 'Medium' },
    ],
    sort: [],
  })
  const v = rows[0]?.medium_budget
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
})()
