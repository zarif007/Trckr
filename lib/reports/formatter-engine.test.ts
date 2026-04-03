import { describe, expect, it } from 'vitest'

import type { FormatterPlanV1 } from './ast-schemas'
import { applyFormatterPlan } from './formatter-engine'

describe('applyFormatterPlan compute_column', () => {
 const rows: Record<string, unknown>[] = [
 { a: 10, b: 3, total: 100 },
 { a: 20, b: 5, total: 200 },
 ]

 it('binary subtract and multiply', () => {
 const plan: FormatterPlanV1 = {
 version: 1,
 outputStyle: 'markdown_table',
 ops: [
 {
 op: 'compute_column',
 name: 'diff',
 expression: {
 kind: 'binary',
 fn: 'subtract',
 left: { path: 'a' },
 right: { path: 'b' },
 },
 },
 {
 op: 'compute_column',
 name: 'twice',
 expression: {
 kind: 'binary',
 fn: 'multiply',
 left: { path: 'diff' },
 right: { num: 2 },
 },
 },
 ],
 }
 const out = applyFormatterPlan(rows, plan)
 expect(out[0]!.diff).toBe(7)
 expect(out[0]!.twice).toBe(14)
 expect(out[1]!.diff).toBe(15)
 expect(out[1]!.twice).toBe(30)
 })

 it('percent with default scale 100', () => {
 const plan: FormatterPlanV1 = {
 version: 1,
 outputStyle: 'markdown_table',
 ops: [
 {
 op: 'compute_column',
 name: 'share',
 expression: {
 kind: 'percent',
 part: { path: 'a' },
 whole: { path: 'total' },
 },
 },
 ],
 }
 const out = applyFormatterPlan(rows, plan)
 expect(out[0]!.share).toBe(10)
 expect(out[1]!.share).toBe(10)
 })

 it('divide by zero yields null', () => {
 const plan: FormatterPlanV1 = {
 version: 1,
 outputStyle: 'markdown_table',
 ops: [
 {
 op: 'compute_column',
 name: 'bad',
 expression: {
 kind: 'binary',
 fn: 'divide',
 left: { num: 1 },
 right: { num: 0 },
 },
 },
 ],
 }
 const out = applyFormatterPlan([{ x: 1 }], plan)
 expect(out[0]!.bad).toBeNull()
 })
})
