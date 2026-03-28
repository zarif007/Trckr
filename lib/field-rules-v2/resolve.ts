// lib/field-rules-v2/resolve.ts

import { evaluateExpr } from '@/lib/functions/evaluator'
import type { FunctionContext } from '@/lib/functions/types'
import {
  SYNC_TRIGGER_TYPES,
  type FieldRulesV2Map,
  type FieldRulesV2Overrides,
  type FieldRulesV2PropertyOverride,
} from './types'

/**
 * Resolves Field Rules V2 for a single grid row synchronously.
 *
 * Only SYNC_TRIGGER_TYPES are evaluated here. Async triggers
 * (onExternalBinding, onDependencyResolve) are handled separately in
 * useFieldRulesV2 with React state.
 *
 * Called at render time — must be pure and fast.
 */
export function resolveFieldRulesV2ForRow(
  fieldRulesV2: FieldRulesV2Map | undefined,
  gridId: string,
  rowValues: Record<string, unknown>,
  _rowIndex: number,
): FieldRulesV2Overrides {
  const propertyOverrides: Record<string, FieldRulesV2PropertyOverride> = {}
  const valueOverrides: Record<string, unknown> = {}

  if (!fieldRulesV2) return { propertyOverrides, valueOverrides }

  const prefix = `${gridId}.`

  for (const [targetPath, rules] of Object.entries(fieldRulesV2)) {
    if (!targetPath.startsWith(prefix)) continue
    const fieldId = targetPath.slice(prefix.length)

    const fnCtx: FunctionContext = {
      rowValues,
      fieldId,
    }

    for (const rule of rules) {
      if (!rule.enabled) continue
      if (!SYNC_TRIGGER_TYPES.includes(rule.trigger)) continue

      // Evaluate guard condition
      if (rule.condition) {
        const pass = evaluateExpr(rule.condition as never, fnCtx)
        if (!pass) continue
      }

      // Evaluate outcome expression
      const value = evaluateExpr(rule.outcome as never, fnCtx)

      if (rule.engineType === 'value') {
        valueOverrides[fieldId] = value
      } else {
        const override = propertyOverrides[fieldId] ?? {}
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
          case 'options':
            if (Array.isArray(value)) {
              override.options = value as FieldRulesV2PropertyOverride['options']
            }
            break
        }
        propertyOverrides[fieldId] = override
      }
    }
  }

  return { propertyOverrides, valueOverrides }
}
