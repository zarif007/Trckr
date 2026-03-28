import { describe, expect, it } from 'vitest'

import { LANDING_DEMO_ANALYSIS_DOCUMENT } from '@/app/components/landing-page/landing-demo-insights'
import {
  buildLandingDemoReportRows,
  buildSyntheticLandingTrackerRows,
  LANDING_DEMO_QUERY_PLAN,
  LANDING_DEMO_REPORT_FILTERED_DEAL_COUNT,
  LANDING_DEMO_REPORT_HIGH_PRIORITY_BUDGET,
  LANDING_DEMO_REPORT_MEDIUM_PRIORITY_BUDGET,
  LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET,
  LANDING_DEMO_REPORT_ROWS,
} from '@/app/components/landing-page/landing-demo-report-snapshot'
import { parseAnalysisDocument } from '@/lib/analysis/analysis-schemas'
import { executeQueryPlan } from '@/lib/insights-query/query-executor'
import { parseQueryPlan } from '@/lib/reports/ast-schemas'

describe('landing-demo-report-snapshot', () => {
  it('parses the marketing query plan', () => {
    expect(parseQueryPlan(LANDING_DEMO_QUERY_PLAN)).toEqual(LANDING_DEMO_QUERY_PLAN)
  })

  it('aggregates pipeline rows with executeQueryPlan (bare paths)', () => {
    const rows = executeQueryPlan(buildSyntheticLandingTrackerRows(), LANDING_DEMO_QUERY_PLAN)
    expect(rows).toHaveLength(3)
    const byStatus = Object.fromEntries(
      rows.map((r) => [String(r.project_status), r] as const),
    )
    expect(byStatus['In Progress']?.sum_budget).toBe(40700)
    expect(byStatus['In Progress']?.deal_count).toBe(4)
    expect(byStatus['In Progress']?.avg_rate).toBe(106.25)
    expect(byStatus['In Progress']?.max_budget).toBe(14700)
    expect(byStatus.Blocked?.sum_budget).toBe(9816)
    expect(byStatus.Blocked?.deal_count).toBe(2)
    expect(byStatus['Not Started']?.sum_budget).toBe(9416)
    expect(byStatus['Not Started']?.deal_count).toBe(2)
  })

  it('exposes report rows whose pipeline_share sums to 1', () => {
    const rows = buildLandingDemoReportRows()
    const sumShare = rows.reduce((s, r) => {
      const v = r.pipeline_share
      return s + (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    }, 0)
    expect(sumShare).toBeCloseTo(1, 5)
  })

  it('keeps exported totals aligned with grouped rows', () => {
    expect(LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET).toBe(59932)
    expect(LANDING_DEMO_REPORT_FILTERED_DEAL_COUNT).toBe(8)
    expect(LANDING_DEMO_REPORT_HIGH_PRIORITY_BUDGET + LANDING_DEMO_REPORT_MEDIUM_PRIORITY_BUDGET).toBe(
      LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET,
    )
    const fromRows = LANDING_DEMO_REPORT_ROWS.reduce((s, r) => {
      const v = r.sum_budget
      return s + (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    }, 0)
    expect(fromRows).toBe(LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET)
  })

  it('parses the analysis document and bar chart totals match recipe budget', () => {
    const parsed = parseAnalysisDocument(LANDING_DEMO_ANALYSIS_DOCUMENT)
    expect(parsed).not.toBeNull()
    const barBlock = LANDING_DEMO_ANALYSIS_DOCUMENT.blocks[0]!
    expect(barBlock.chartSpec?.type).toBe('bar')
    expect(barBlock.chartData).toBeDefined()
    const barSum = (barBlock.chartData ?? []).reduce((s, row) => {
      const v = row.budget
      return s + (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    }, 0)
    expect(barSum).toBe(LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET)

    const pieBlock = LANDING_DEMO_ANALYSIS_DOCUMENT.blocks[1]!
    expect(pieBlock.chartSpec?.type).toBe('pie')
    const pieSum = (pieBlock.chartData ?? []).reduce((s, row) => {
      const v = row.budget
      return s + (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    }, 0)
    expect(pieSum).toBe(LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET)
  })
})
