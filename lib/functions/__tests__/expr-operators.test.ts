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
