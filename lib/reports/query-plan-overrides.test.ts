import { describe, expect, it } from 'vitest'

import { mergeQueryPlanWithOverrides } from './query-plan-overrides'
import type { QueryPlanV1 } from './ast-schemas'

const basePlan: QueryPlanV1 = {
  version: 1,
  load: {
    maxTrackerDataRows: 500,
    rowTimeFilter: { field: 'createdAt', preset: 'last_7_days' },
  },
  flatten: { gridIds: [] },
  filter: [{ path: 'region', op: 'eq', value: 'East' }],
  aggregate: {
    groupBy: ['region'],
    metrics: [{ name: 'n', op: 'count' }],
  },
  sort: [],
}

describe('mergeQueryPlanWithOverrides', () => {
  it('merges row time filter and replaces filter list', () => {
    const r = mergeQueryPlanWithOverrides(basePlan, {
      load: { rowTimeFilter: { field: 'updatedAt', preset: 'last_30_days' } },
      filter: [{ path: 'amount', op: 'gte', value: 10 }],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.plan.load.rowTimeFilter).toEqual({
      field: 'updatedAt',
      preset: 'last_30_days',
    })
    expect(r.plan.filter).toEqual([{ path: 'amount', op: 'gte', value: 10 }])
    expect(r.plan.aggregate?.groupBy).toEqual(['region'])
  })

  it('clears row time filter when null', () => {
    const r = mergeQueryPlanWithOverrides(basePlan, {
      load: { rowTimeFilter: null },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.plan.load.rowTimeFilter).toBeUndefined()
  })

  it('replaces aggregate groupBy when aggregate exists', () => {
    const r = mergeQueryPlanWithOverrides(basePlan, {
      aggregateGroupBy: ['a', 'b'],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.plan.aggregate?.groupBy).toEqual(['a', 'b'])
    expect(r.plan.aggregate?.metrics).toEqual(basePlan.aggregate!.metrics)
  })

  it('rejects aggregateGroupBy when there is no aggregate', () => {
    const noAgg: QueryPlanV1 = {
      ...basePlan,
      aggregate: undefined,
    }
    const r = mergeQueryPlanWithOverrides(noAgg, {
      aggregateGroupBy: ['x'],
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/no aggregate/i)
  })

  it('rejects merged plan when final zod validation fails', () => {
    const bad = mergeQueryPlanWithOverrides(basePlan, {
      filter: [
        {
          path: 'x',
          // @ts-expect-error exercise zod failure on query plan
          op: 'not_a_comparison',
          value: 1,
        },
      ],
    })
    expect(bad.ok).toBe(false)
  })
})
