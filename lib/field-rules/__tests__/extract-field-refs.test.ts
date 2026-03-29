import { describe, it, expect } from 'vitest'
import { extractFieldRefsFromExpr } from '../extract-field-refs'
import type { ExprNode } from '@/lib/functions/types'

describe('extractFieldRefsFromExpr', () => {
  it('returns empty array for null/undefined', () => {
    expect(extractFieldRefsFromExpr(null)).toEqual([])
    expect(extractFieldRefsFromExpr(undefined)).toEqual([])
  })

  it('returns empty array for a const node', () => {
    expect(extractFieldRefsFromExpr({ op: 'const', value: 42 })).toEqual([])
  })

  it('extracts a single field ref', () => {
    const expr: ExprNode = { op: 'field', fieldId: 'main_grid.status' }
    expect(extractFieldRefsFromExpr(expr)).toEqual(['main_grid.status'])
  })

  it('extracts field refs from a comparison expression', () => {
    const expr: ExprNode = {
      op: 'gt',
      left: { op: 'field', fieldId: 'main_grid.amount' },
      right: { op: 'const', value: 5 },
    }
    expect(extractFieldRefsFromExpr(expr)).toEqual(['main_grid.amount'])
  })

  it('deduplicates field refs', () => {
    const expr: ExprNode = {
      op: 'and',
      args: [
        { op: 'field', fieldId: 'main_grid.status' },
        { op: 'field', fieldId: 'main_grid.status' },
      ],
    }
    expect(extractFieldRefsFromExpr(expr)).toEqual(['main_grid.status'])
  })

  it('extracts from nested if expression', () => {
    const expr: ExprNode = {
      op: 'if',
      cond: { op: 'field', fieldId: 'main_grid.type' },
      then: { op: 'field', fieldId: 'main_grid.labelA' },
      else: { op: 'field', fieldId: 'main_grid.labelB' },
    }
    const refs = extractFieldRefsFromExpr(expr)
    expect(refs).toHaveLength(3)
    expect(refs).toContain('main_grid.type')
    expect(refs).toContain('main_grid.labelA')
    expect(refs).toContain('main_grid.labelB')
  })

  it('extracts from deeply nested expression', () => {
    const expr: ExprNode = {
      op: 'and',
      args: [
        {
          op: 'gt',
          left: { op: 'field', fieldId: 'main_grid.score' },
          right: { op: 'const', value: 10 },
        },
        {
          op: 'eq',
          left: { op: 'field', fieldId: 'main_grid.status' },
          right: { op: 'const', value: 'active' },
        },
      ],
    }
    const refs = extractFieldRefsFromExpr(expr)
    expect(refs).toHaveLength(2)
    expect(refs).toContain('main_grid.score')
    expect(refs).toContain('main_grid.status')
  })

  it('ignores accumulate/sum/count nodes (cross-row, not field watches)', () => {
    const expr: ExprNode = {
      op: 'accumulate',
      sourceFieldId: 'items_grid.amount',
      action: 'add',
    }
    expect(extractFieldRefsFromExpr(expr)).toEqual([])
  })

  it('handles not, abs, regex, clamp, slice nodes', () => {
    const notExpr: ExprNode = {
      op: 'not',
      arg: { op: 'field', fieldId: 'grid.a' },
    }
    expect(extractFieldRefsFromExpr(notExpr)).toEqual(['grid.a'])

    const regexExpr: ExprNode = {
      op: 'regex',
      value: { op: 'field', fieldId: 'grid.b' },
      pattern: '^test',
    }
    expect(extractFieldRefsFromExpr(regexExpr)).toEqual(['grid.b'])

    const clampExpr: ExprNode = {
      op: 'clamp',
      value: { op: 'field', fieldId: 'grid.c' },
      min: { op: 'const', value: 0 },
      max: { op: 'const', value: 100 },
    }
    expect(extractFieldRefsFromExpr(clampExpr)).toEqual(['grid.c'])
  })
})
