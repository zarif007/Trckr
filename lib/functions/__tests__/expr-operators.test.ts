import { describe, expect, it } from 'vitest'
import { evaluateExpr } from '../evaluator'
import type { TrackerLike } from '../../validate-tracker/types'
import { buildValidationContext } from '../../validate-tracker/context'
import { validateValidations } from '../../validate-tracker/validators/validations'

describe('expression operator aliases', () => {
  it('accepts symbolic comparison operators in nested validation expressions', () => {
    const tracker = {
      tabs: [{ id: 'main_tab' }],
      sections: [{ id: 'main_section', tabId: 'main_tab' }],
      grids: [{ id: 'summary_grid', sectionId: 'main_section' }],
      fields: [{ id: 'total_items', dataType: 'number', config: {} }],
      layoutNodes: [{ gridId: 'summary_grid', fieldId: 'total_items', order: 1 }],
      validations: {
        'summary_grid.total_items': [
          {
            type: 'expr' as const,
            expr: {
              op: 'eq' as const,
              left: { op: 'const' as const, value: true },
              right: {
                op: '>' as const,
                left: { op: 'field' as const, fieldId: 'summary_grid.total_items' },
                right: { op: 'const' as const, value: 0 },
              },
            },
          },
        ],
      },
    }

    const ctx = buildValidationContext(tracker)
    const result = validateValidations(ctx)
    expect(result.errors ?? []).toHaveLength(0)
  })

  it('evaluates symbolic comparison operators correctly', () => {
    const ctx = {
      rowValues: { 'summary_grid.total_items': 5 },
      fieldId: 'summary_grid.total_items',
    }

    const expr = {
      op: 'and' as const,
      args: [
        {
          op: '>' as const,
          left: { op: 'field' as const, fieldId: 'summary_grid.total_items' },
          right: { op: 'const' as const, value: 2 },
        },
        {
          op: '<=' as const,
          left: { op: 'field' as const, fieldId: 'summary_grid.total_items' },
          right: { op: 'const' as const, value: 5 },
        },
      ],
    }

    expect(evaluateExpr(expr, ctx)).toBe(true)
  })

  it('still rejects unknown operators', () => {
    const tracker = {
      tabs: [{ id: 'main_tab' }],
      sections: [{ id: 'main_section', tabId: 'main_tab' }],
      grids: [{ id: 'summary_grid', sectionId: 'main_section' }],
      fields: [{ id: 'total_items', dataType: 'number', config: {} }],
      layoutNodes: [{ gridId: 'summary_grid', fieldId: 'total_items', order: 1 }],
      validations: {
        'summary_grid.total_items': [
          {
            type: 'expr' as const,
            expr: {
              op: 'between' as const,
              left: { op: 'field' as const, fieldId: 'summary_grid.total_items' },
              right: { op: 'const' as const, value: 10 },
            },
          },
        ],
      },
    }

    const ctx = buildValidationContext(tracker as unknown as TrackerLike)
    const result = validateValidations(ctx)
    expect(result.errors ?? []).toContain(
      'validations.summary_grid.total_items[0].expr.op is not a supported operator',
    )
  })
})

describe('accumulate expression', () => {
  const baseCtx = {
    rowValues: {} as Record<string, unknown>,
    fieldId: 'main_grid.total',
  }

  it('returns initial value when getColumnValues is missing', () => {
    const expr = {
      op: 'accumulate' as const,
      sourceFieldId: 'amounts_grid.amount',
      action: 'add' as const,
    }
    expect(evaluateExpr(expr, baseCtx)).toBe(0)
    expect(
      evaluateExpr({ ...expr, action: 'mul' }, baseCtx),
    ).toBe(1)
  })

  it('returns initial value for empty column', () => {
    const expr = {
      op: 'accumulate' as const,
      sourceFieldId: 'amounts_grid.amount',
      action: 'add' as const,
    }
    const ctx = {
      ...baseCtx,
      getColumnValues: (path: string) => (path === 'amounts_grid.amount' ? [] : []),
    }
    expect(evaluateExpr(expr, ctx)).toBe(0)
  })

  it('sums column values (add)', () => {
    const expr = {
      op: 'accumulate' as const,
      sourceFieldId: 'amounts_grid.amount',
      action: 'add' as const,
    }
    const ctx = {
      ...baseCtx,
      getColumnValues: () => [10, 20, 30],
    }
    expect(evaluateExpr(expr, ctx)).toBe(60)
  })

  it('multiplies column values (mul)', () => {
    const expr = {
      op: 'accumulate' as const,
      sourceFieldId: 'amounts_grid.amount',
      action: 'mul' as const,
    }
    const ctx = {
      ...baseCtx,
      getColumnValues: () => [2, 3, 4],
    }
    expect(evaluateExpr(expr, ctx)).toBe(24)
  })

  it('subtracts column values (sub): initialValue - v0 - v1 - ...', () => {
    const expr = {
      op: 'accumulate' as const,
      sourceFieldId: 'amounts_grid.amount',
      action: 'sub' as const,
    }
    const ctx = {
      ...baseCtx,
      getColumnValues: () => [1, 2, 3],
    }
    expect(evaluateExpr(expr, ctx)).toBe(0 - 1 - 2 - 3)
  })

  it('respects startIndex and endIndex', () => {
    const expr = {
      op: 'accumulate' as const,
      sourceFieldId: 'amounts_grid.amount',
      startIndex: 1,
      endIndex: 3,
      action: 'add' as const,
    }
    const ctx = {
      ...baseCtx,
      getColumnValues: () => [100, 10, 20, 30, 40],
    }
    expect(evaluateExpr(expr, ctx)).toBe(10 + 20 + 30)
  })

  it('respects increment step', () => {
    const expr = {
      op: 'accumulate' as const,
      sourceFieldId: 'amounts_grid.amount',
      startIndex: 0,
      endIndex: 4,
      increment: 2,
      action: 'add' as const,
    }
    const ctx = {
      ...baseCtx,
      getColumnValues: () => [1, 2, 3, 4, 5],
    }
    expect(evaluateExpr(expr, ctx)).toBe(1 + 3 + 5)
  })

  it('returns initial value when start > end after clamping', () => {
    const expr = {
      op: 'accumulate' as const,
      sourceFieldId: 'amounts_grid.amount',
      startIndex: 2,
      endIndex: 1,
      action: 'add' as const,
    }
    const ctx = {
      ...baseCtx,
      getColumnValues: () => [1, 2, 3],
    }
    expect(evaluateExpr(expr, ctx)).toBe(0)
  })
})
