import { describe, expect, it } from 'vitest'

import type { ExprNode } from '@/lib/functions/types'

import { applyCalcPlanToRows, emptyCalcPlan, parseCalcPlan, reportCalcPlanV1Schema } from './calc-plan'

describe('parseCalcPlan', () => {
 it('accepts v1 with valid expr nodes', () => {
 const expr: ExprNode = {
 op: 'mul',
 args: [
 { op: 'field', fieldId: 'g.qty' },
 { op: 'const', value: 2 },
 ],
 } as ExprNode
 const parsed = parseCalcPlan({ version: 1, columns: [{ name: 'double_qty', expr }] })
 expect(parsed).toEqual({ version: 1, columns: [{ name: 'double_qty', expr }] })
 })

 it('rejects bad version', () => {
 expect(parseCalcPlan({ version: 2, columns: [] })).toBeNull()
 })

 it('rejects non-object expr', () => {
 expect(
 parseCalcPlan({
 version: 1,
 columns: [{ name: 'x', expr: null }],
 }),
 ).toBeNull()
 })
})

describe('applyCalcPlanToRows', () => {
 it('applies columns in order', () => {
 const mulExpr: ExprNode = {
 op: 'mul',
 args: [
 { op: 'field', fieldId: 'g.a' },
 { op: 'field', fieldId: 'g.b' },
 ],
 } as ExprNode
 const addExpr: ExprNode = {
 op: 'add',
 args: [
 { op: 'field', fieldId: 'g.a' },
 { op: 'field', fieldId: 'line' },
 ],
 } as ExprNode

 const plan = reportCalcPlanV1Schema.parse({
 version: 1,
 columns: [
 { name: 'line', expr: mulExpr },
 { name: 'sum_ab', expr: addExpr },
 ],
 })

 const rows = applyCalcPlanToRows(
 [{ __gridId: 'g', a: 3, b: 4 } as Record<string, unknown>],
 plan,
 )
 expect(rows[0].line).toBe(12)
 expect(rows[0].sum_ab).toBe(15)
 })

 it('returns shallow copies when plan empty', () => {
 const r = [{ x: 1 }]
 const out = applyCalcPlanToRows(r, emptyCalcPlan())
 expect(out[0]).not.toBe(r[0])
 expect(out[0]).toEqual({ x: 1 })
 })
})
