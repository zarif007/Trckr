import { describe, it, expect } from 'vitest'
import { resolveFieldRulesForRow } from '../resolve'
import type { FieldRule, FieldRulesMap } from '../types'
import type { ExprNode } from '@/lib/functions/types'

const constExpr = (value: unknown): ExprNode => ({ op: 'const', value } as ExprNode)
const fieldExpr = (fieldId: string): ExprNode => ({ op: 'field', fieldId } as ExprNode)
const eqExpr = (left: ExprNode, right: ExprNode): ExprNode => ({
  op: 'eq', left, right,
} as ExprNode)

function makeRule(overrides: Partial<FieldRule>): FieldRule {
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

describe('resolveFieldRulesForRow', () => {
  it('returns empty overrides when no rules', () => {
    const result = resolveFieldRulesForRow({}, 'tasks_grid', {}, 0)
    expect(result.overrides).toEqual({})
    expect(result.valueOverrides).toEqual({})
  })

  it('applies visibility rule — true means visible', () => {
    const map: FieldRulesMap = {
      'tasks_grid.title': [makeRule({ property: 'visibility', outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.overrides['title']?.visibility).toBe(true)
  })

  it('applies required rule', () => {
    const map: FieldRulesMap = {
      'tasks_grid.title': [makeRule({ property: 'required', outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.overrides['title']?.required).toBe(true)
  })

  it('applies disabled rule', () => {
    const map: FieldRulesMap = {
      'tasks_grid.status': [makeRule({ property: 'disabled', outcome: constExpr(false) })],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.overrides['status']?.disabled).toBe(false)
  })

  it('applies label rule', () => {
    const map: FieldRulesMap = {
      'tasks_grid.notes': [makeRule({ property: 'label', outcome: constExpr('Remarks') })],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.overrides['notes']?.label).toBe('Remarks')
  })

  it('applies value rule via value engine', () => {
    const map: FieldRulesMap = {
      'tasks_grid.total': [
        makeRule({ property: 'value', outcome: constExpr(42), engineType: 'value' }),
      ],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.valueOverrides['total']).toBe(42)
  })

  it('skips disabled rules', () => {
    const map: FieldRulesMap = {
      'tasks_grid.title': [makeRule({ enabled: false, outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.overrides['title']).toBeUndefined()
  })

  it('skips rules where condition evaluates falsy', () => {
    const map: FieldRulesMap = {
      'tasks_grid.title': [makeRule({ condition: constExpr(false), outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.overrides['title']).toBeUndefined()
  })

  it('evaluates condition against rowValues', () => {
    const map: FieldRulesMap = {
      'tasks_grid.blocked_reason': [
        makeRule({
          condition: eqExpr(fieldExpr('tasks_grid.status'), constExpr('blocked')),
          property: 'visibility',
          outcome: constExpr(true),
        }),
      ],
    }
    const withBlocked = resolveFieldRulesForRow(map, 'tasks_grid', { 'tasks_grid.status': 'blocked' }, 0)
    expect(withBlocked.overrides['blocked_reason']?.visibility).toBe(true)

    const withoutBlocked = resolveFieldRulesForRow(map, 'tasks_grid', { 'tasks_grid.status': 'open' }, 0)
    expect(withoutBlocked.overrides['blocked_reason']).toBeUndefined()
  })

  it('last-writer wins when multiple rules target same property', () => {
    const map: FieldRulesMap = {
      'tasks_grid.title': [
        makeRule({ id: 'r1', outcome: constExpr(false), property: 'required' }),
        makeRule({ id: 'r2', outcome: constExpr(true), property: 'required' }),
      ],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.overrides['title']?.required).toBe(true)
  })

  it('ignores rules targeting other grids', () => {
    const map: FieldRulesMap = {
      'other_grid.field': [makeRule({ outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
    expect(result.overrides).toEqual({})
  })

  it('all lifecycle triggers are evaluated', () => {
    const triggers: Array<FieldRule['trigger']> = ['onMount', 'onRowCreate', 'onRowCopy', 'onRowFocus']
    for (const trigger of triggers) {
      const map: FieldRulesMap = {
        'tasks_grid.title': [makeRule({ trigger, outcome: constExpr(true) })],
      }
      const result = resolveFieldRulesForRow(map, 'tasks_grid', {}, 0)
      expect(result.overrides['title']?.visibility).toBe(true)
    }
  })
})
