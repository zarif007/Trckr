import { describe, expect, it } from 'vitest'

import { parseFormatterPlan, parseQueryPlan, queryPlanV1Schema } from './ast-schemas'

describe('parseQueryPlan', () => {
  it('accepts a minimal valid v1 plan', () => {
    const plan = {
      version: 1 as const,
      load: { maxTrackerDataRows: 100 },
      flatten: { gridIds: [] },
    }
    const parsed = parseQueryPlan(plan)
    expect(parsed).not.toBeNull()
    expect(parsed!.filter).toEqual([])
    expect(parsed!.sort).toEqual([])
  })

  it('rejects wrong version', () => {
    expect(parseQueryPlan({ version: 2, load: { maxTrackerDataRows: 1 }, flatten: { gridIds: [] } })).toBeNull()
  })
})

describe('parseFormatterPlan', () => {
  it('defaults ops and outputStyle', () => {
    const parsed = parseFormatterPlan({ version: 1 })
    expect(parsed).not.toBeNull()
    expect(parsed!.ops).toEqual([])
    expect(parsed!.outputStyle).toBe('markdown_table')
  })
})

describe('queryPlanV1Schema', () => {
  it('parses filter and aggregate', () => {
    const r = queryPlanV1Schema.safeParse({
      version: 1,
      load: { maxTrackerDataRows: 10, branchName: 'main' },
      flatten: { gridIds: ['g1'] },
      filter: [{ path: 'amount', op: 'gte', value: 5 }],
      aggregate: {
        groupBy: ['region'],
        metrics: [{ name: 'total', op: 'sum', path: 'amount' }],
      },
      sort: [{ path: 'total', direction: 'desc' as const }],
      limit: 50,
    })
    expect(r.success).toBe(true)
  })
})
