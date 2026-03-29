/**
 * Resolve field rules against row values to produce per-field overrides
 * for a target grid row. All triggers are lifecycle-based and evaluated
 * synchronously at render time — must be pure and fast.
 */

import { evaluateExpr } from '@/lib/functions/evaluator'
import type { FunctionContext } from '@/lib/functions/types'
import type { FieldRulesMap, FieldRulesResult, FieldRuleOverride } from './types'

export function resolveFieldRulesForRow(
  fieldRules: FieldRulesMap | undefined,
  gridId: string,
  rowValues: Record<string, unknown>,
  _rowIndex: number,
): FieldRulesResult {
  const overrides: Record<string, FieldRuleOverride> = {}
  const valueOverrides: Record<string, unknown> = {}

  if (!fieldRules) return { overrides, valueOverrides }

  const prefix = `${gridId}.`

  for (const [targetPath, rules] of Object.entries(fieldRules)) {
    if (!targetPath.startsWith(prefix)) continue
    const fieldId = targetPath.slice(prefix.length)

    const fnCtx: FunctionContext = { rowValues, fieldId }

    for (const rule of rules) {
      if (!rule.enabled) continue

      if (rule.condition) {
        const pass = evaluateExpr(rule.condition as never, fnCtx)
        if (!pass) continue
      }

      const value = evaluateExpr(rule.outcome as never, fnCtx)

      if (rule.engineType === 'value') {
        valueOverrides[fieldId] = value
      } else {
        const override = overrides[fieldId] ?? {}
        switch (rule.property) {
          case 'visibility':
            override.visibility = Boolean(value)
            break
          case 'label':
            if (typeof value === 'string') override.label = value
            break
          case 'required':
            override.required = Boolean(value)
            break
          case 'disabled':
            override.disabled = Boolean(value)
            break
        }
        overrides[fieldId] = override
      }
    }
  }

  return { overrides, valueOverrides }
}
