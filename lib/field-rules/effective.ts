/**
 * Builds effective FieldRule[] from schema: prefers fieldRulesByTarget (flattened),
 * falls back to fieldRules array.
 */

import type { FieldRule, FieldRuleForTarget, FieldRules } from './types'

export type SchemaWithFieldRules = {
  fieldRulesByTarget?: Record<string, FieldRuleForTarget[]>
  fieldRules?: FieldRules
}

export function getEffectiveFieldRules(schema: SchemaWithFieldRules | undefined | null): FieldRules {
  if (!schema) return []
  const byTarget = schema.fieldRulesByTarget
  if (byTarget && Object.keys(byTarget).length > 0) {
    const result: FieldRule[] = []
    for (const [targetPath, rules] of Object.entries(byTarget)) {
      if (!Array.isArray(rules)) continue
      for (const r of rules) {
        if (!r?.source) continue
        result.push({
          source: r.source,
          operator: r.operator,
          value: r.value,
          action: r.action,
          set: r.set,
          targets: [targetPath],
          priority: r.priority,
        })
      }
    }
    return result
  }
  return Array.isArray(schema.fieldRules) ? schema.fieldRules : []
}
