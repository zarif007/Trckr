import { describe, expect, it } from 'vitest'

import {
 intentUsesOnlyCountAggregates,
 shouldRetryIntentForNumericTotalMismatch,
 userPromptImpliesNumericTotal,
} from '@/lib/reports/intent-numeric-total-guard'
import type { ReportIntent } from '@/lib/reports/report-schemas'

function intentWithMetrics(
 metrics: ReportIntent['metrics'],
): ReportIntent {
 return {
 narrative: 'test',
 gridIds: [],
 metrics,
 groupByFieldPaths: [],
 filters: [],
 timeRange: { kind: 'none' },
 outputStyle: 'table',
 generationPlan: {
 objectives: [],
 instancePolicy: 'combined_all',
 keyComparisons: [],
 formatterGuidance: '',
 caveats: [],
 },
 }
}

describe('userPromptImpliesNumericTotal', () => {
 it('matches total volume and sum wording', () => {
 expect(userPromptImpliesNumericTotal('What is the total volume of sales?')).toBe(true)
 expect(userPromptImpliesNumericTotal('combined revenue by quarter')).toBe(true)
 expect(userPromptImpliesNumericTotal('how much did we sell')).toBe(true)
 })

 it('does not match generic listing', () => {
 expect(userPromptImpliesNumericTotal('List open tasks with due dates')).toBe(false)
 })

 it('does not treat unrelated words as totals', () => {
 expect(userPromptImpliesNumericTotal('Totally optional notes')).toBe(false)
 })
})

describe('shouldRetryIntentForNumericTotalMismatch', () => {
 it('is true when prompt implies numeric total but metrics are count-only', () => {
 const intent = intentWithMetrics([
 { label: 'rows', aggregation: 'count', fieldPath: '' },
 ])
 expect(
 shouldRetryIntentForNumericTotalMismatch('Show total volume across all instances', intent),
 ).toBe(true)
 })

 it('is false when metrics include sum', () => {
 const intent = intentWithMetrics([
 { label: 'vol', aggregation: 'sum', fieldPath: 'amount' },
 ])
 expect(shouldRetryIntentForNumericTotalMismatch('total volume', intent)).toBe(false)
 })

 it('is false when metrics array is empty', () => {
 const intent = intentWithMetrics([])
 expect(shouldRetryIntentForNumericTotalMismatch('total volume', intent)).toBe(false)
 })
})

describe('intentUsesOnlyCountAggregates', () => {
 it('is true only when every metric is count', () => {
 expect(intentUsesOnlyCountAggregates(intentWithMetrics([{ label: 'a', aggregation: 'count', fieldPath: '' }]))).toBe(
 true,
 )
 expect(
 intentUsesOnlyCountAggregates(
 intentWithMetrics([
 { label: 'a', aggregation: 'count', fieldPath: '' },
 { label: 'b', aggregation: 'sum', fieldPath: 'x' },
 ]),
 ),
 ).toBe(false)
 })
})
