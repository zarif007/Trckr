import type { TrackerLike } from '@/lib/validate-tracker'

import type { ExprIntent } from './types'

interface ValidationRuleWithIntent {
  type: string
  _intent?: string
  message?: string
  [key: string]: unknown
}

interface CalculationWithIntent {
  _intent?: string
  expr?: unknown
  [key: string]: unknown
}

export function isIntentValidationRule(rule: unknown): rule is ValidationRuleWithIntent {
  if (!rule || typeof rule !== 'object') return false
  const r = rule as Record<string, unknown>
  return r.type === 'expr' && typeof r._intent === 'string'
}

export function isIntentCalculation(entry: unknown): entry is CalculationWithIntent {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as Record<string, unknown>
  return typeof e._intent === 'string' && !e.expr
}

/**
 * Collect all validation/calculation entries that still use `_intent` and need AST generation.
 */
export function collectExprIntents(tracker: TrackerLike): ExprIntent[] {
  const intents: ExprIntent[] = []

  const validations = tracker.validations ?? {}
  for (const [fieldPath, rules] of Object.entries(validations)) {
    if (!Array.isArray(rules)) continue
    for (let i = 0; i < rules.length; i++) {
      if (isIntentValidationRule(rules[i])) {
        intents.push({
          fieldPath,
          purpose: 'validation',
          description: (rules[i] as ValidationRuleWithIntent)._intent!,
          ruleIndex: i,
        })
      }
    }
  }

  const calculations =
    (tracker as TrackerLike & { calculations?: Record<string, unknown> }).calculations ?? {}
  for (const [fieldPath, entry] of Object.entries(calculations)) {
    if (isIntentCalculation(entry)) {
      intents.push({
        fieldPath,
        purpose: 'calculation',
        description: (entry as CalculationWithIntent)._intent!,
      })
    }
  }

  return intents
}
