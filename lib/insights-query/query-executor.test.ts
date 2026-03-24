import { describe, expect, it } from 'vitest'

import {
  buildTrackerDataWhere,
  compareValues,
  executeQueryPlan,
  type TrackerDataInput,
} from './query-executor'
import type { QueryPlanV1 } from './schemas'

describe('compareValues', () => {
  it('compares eq and in', () => {
    expect(compareValues(3, 'eq', 3)).toBe(true)
    expect(compareValues('a', 'in', ['a', 'b'])).toBe(true)
    expect(compareValues('hello', 'contains', 'ell')).toBe(true)
  })
})

describe('executeQueryPlan', () => {
  const rows: TrackerDataInput[] = [
    {
      id: 'd1',
      label: 'A',
      branchName: 'main',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      data: {
        sales: [
          { amount: 10, region: 'east' },
          { amount: 20, region: 'west' },
        ],
      },
    },
  ]

  const basePlan: QueryPlanV1 = {
    version: 1,
    load: { maxTrackerDataRows: 50 },
    flatten: { gridIds: ['sales'] },
    filter: [],
    sort: [],
  }

  it('flattens grid rows and filters', () => {
    const plan: QueryPlanV1 = {
      ...basePlan,
      filter: [{ path: 'amount', op: 'gte', value: 15 }],
    }
    const out = executeQueryPlan(rows, plan)
    expect(out).toHaveLength(1)
    expect(out[0]!.amount).toBe(20)
  })

  it('aggregates by groupBy', () => {
    const plan: QueryPlanV1 = {
      ...basePlan,
      aggregate: {
        groupBy: ['region'],
        metrics: [
          { name: 'n', op: 'count' },
          { name: 'total', op: 'sum', path: 'amount' },
        ],
      },
    }
    const out = executeQueryPlan(rows, plan)
    expect(out).toHaveLength(2)
    const east = out.find((r) => r.region === 'east')
    expect(east?.total).toBe(10)
  })

  it('sums expression per row (e.g. quantity × unit_price)', () => {
    const inv: TrackerDataInput[] = [
      {
        id: 'd1',
        label: null,
        branchName: 'main',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          inventory_grid: [
            { quantity: 12, unit_price: 3200 },
            { quantity: 3, unit_price: 6000 },
          ],
        },
      },
    ]
    const plan: QueryPlanV1 = {
      version: 1,
      load: { maxTrackerDataRows: 50 },
      flatten: { gridIds: ['inventory_grid'] },
      filter: [],
      sort: [],
      aggregate: {
        groupBy: [],
        metrics: [
          { name: 'total_quantity', op: 'sum', path: 'quantity' },
          {
            name: 'total_value',
            op: 'sum',
            expression: {
              kind: 'binary',
              fn: 'multiply',
              left: { path: 'quantity' },
              right: { path: 'unit_price' },
            },
          },
        ],
      },
    }
    const out = executeQueryPlan(inv, plan)
    expect(out).toHaveLength(1)
    expect(out[0]!.total_quantity).toBe(15)
    expect(out[0]!.total_value).toBe(12 * 3200 + 3 * 6000)
  })
})

describe('buildTrackerDataWhere', () => {
  it('defaults branch to main', () => {
    const w = buildTrackerDataWhere('ts1', {
      maxTrackerDataRows: 10,
    })
    expect(w).toMatchObject({ trackerSchemaId: 'ts1', branchName: 'main' })
  })
})
