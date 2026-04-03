import type { FieldCalculationRule } from '@/lib/functions/types'
import type { TrackerLike } from '@/lib/validate-tracker'

import type { ExprIntentResolution } from './types'

interface ValidationRuleWithIntent {
 type: string
 _intent?: string
 message?: string
 [key: string]: unknown
}

/**
 * Merge successful expression generations back into validations / calculations.
 */
export function applyExprIntentResults(
 tracker: TrackerLike,
 resolutions: ExprIntentResolution[],
): TrackerLike {
 if (resolutions.length === 0) return tracker

 const validations = { ...(tracker.validations ?? {}) }
 const calculations = {
 ...((tracker as TrackerLike & { calculations?: Record<string, unknown> }).calculations ?? {}),
 }

 for (const { intent, expr } of resolutions) {
 if (intent.purpose === 'validation' && intent.ruleIndex != null) {
 const rules = [...(validations[intent.fieldPath] ?? [])]
 const existingRule = rules[intent.ruleIndex] as ValidationRuleWithIntent | undefined
 if (existingRule) {
 const { _intent: _, ...rest } = existingRule
 rules[intent.ruleIndex] = { ...rest, expr } as unknown as (typeof rules)[number]
 }
 validations[intent.fieldPath] = rules
 } else if (intent.purpose === 'calculation') {
 calculations[intent.fieldPath] = { expr } as FieldCalculationRule
 }
 }

 return { ...tracker, validations, calculations } as TrackerLike
}
