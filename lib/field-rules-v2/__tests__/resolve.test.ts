import { describe, it, expect } from 'vitest'
import { resolveFieldRulesV2ForRow } from '../resolve'
import type { FieldRuleV2, FieldRulesV2Map } from '../types'

import type { ExprNode } from '@/lib/functions/types'

const constExpr = (value: unknown): ExprNode => ({ op: 'const', value } as ExprNode)
const fieldExpr = (fieldId: string): ExprNode => ({ op: 'field', fieldId } as ExprNode)
const eqExpr = (left: ExprNode, right: ExprNode): ExprNode => ({
  op: 'eq',
  left,
  right,
} as ExprNode)

function makeRule(overrides: Partial<FieldRuleV2>): FieldRuleV2 {
  return {
    id: 'r1',
    enabled: true,
    trigger: 'onMount',
    property: 'visibility',
    outcome: constExpr(true),
    engineType: 'property',
    ...overrides,
  }
}

describe('resolveFieldRulesV2ForRow', () => {
  it('returns empty overrides when no rules', () => {
    const result = resolveFieldRulesV2ForRow({}, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides).toEqual({})
    expect(result.valueOverrides).toEqual({})
  })

  it('applies visibility rule — true means visible (not hidden)', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [makeRule({ property: 'visibility', outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']?.visibility).toBe(true)
  })

  it('applies required rule', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [makeRule({ property: 'required', outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']?.required).toBe(true)
  })

  it('applies disabled rule', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.status': [makeRule({ property: 'disabled', outcome: constExpr(false) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['status']?.disabled).toBe(false)
  })

  it('applies label rule', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.notes': [makeRule({ property: 'label', outcome: constExpr('Remarks') })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['notes']?.label).toBe('Remarks')
  })

  it('applies value rule via value engine', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.total': [
        makeRule({ property: 'value', outcome: constExpr(42), engineType: 'value' }),
      ],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.valueOverrides['total']).toBe(42)
  })

  it('skips disabled rules', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [makeRule({ enabled: false, outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']).toBeUndefined()
  })

  it('skips rules where condition evaluates falsy', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [
        makeRule({
          condition: constExpr(false),
          outcome: constExpr(true),
        }),
      ],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']).toBeUndefined()
  })

  it('evaluates condition against rowValues', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.blocked_reason': [
        makeRule({
          trigger: 'onFieldChange',
          triggerConfig: { watchedFieldId: 'tasks_grid.status' },
          condition: eqExpr(fieldExpr('tasks_grid.status'), constExpr('blocked')),
          property: 'visibility',
          outcome: constExpr(true),
        }),
      ],
    }
    const withBlocked = resolveFieldRulesV2ForRow(
      map,
      'tasks_grid',
      { 'tasks_grid.status': 'blocked' },
      0,
    )
    expect(withBlocked.propertyOverrides['blocked_reason']?.visibility).toBe(true)

    const withoutBlocked = resolveFieldRulesV2ForRow(
      map,
      'tasks_grid',
      { 'tasks_grid.status': 'open' },
      0,
    )
    expect(withoutBlocked.propertyOverrides['blocked_reason']).toBeUndefined()
  })

  it('last-writer wins when multiple rules target same property', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [
        makeRule({ id: 'r1', outcome: constExpr(false), property: 'required' }),
        makeRule({ id: 'r2', outcome: constExpr(true), property: 'required' }),
      ],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']?.required).toBe(true)
  })

  it('ignores rules targeting other grids', () => {
    const map: FieldRulesV2Map = {
      'other_grid.field': [makeRule({ outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides).toEqual({})
  })

  it('skips async trigger types', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [makeRule({ trigger: 'onExternalBinding', outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']).toBeUndefined()
  })
})
