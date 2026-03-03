/**
 * Builds effective DependsOnRule[] from schema: prefers dependsOnByTarget (flattened),
 * falls back to legacy dependsOn array.
 */

import type { DependsOnRule, DependsOnRuleForTarget, DependsOnRules } from './types'

export type SchemaWithDependsOn = {
  dependsOnByTarget?: Record<string, DependsOnRuleForTarget[]>
  dependsOn?: DependsOnRules
}

export function getEffectiveDependsOn(schema: SchemaWithDependsOn | undefined | null): DependsOnRules {
  if (!schema) return []
  const byTarget = schema.dependsOnByTarget
  if (byTarget && Object.keys(byTarget).length > 0) {
    const result: DependsOnRule[] = []
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
  return Array.isArray(schema.dependsOn) ? schema.dependsOn : []
}
