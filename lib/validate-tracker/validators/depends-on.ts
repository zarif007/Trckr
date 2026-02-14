/**
 * Validates dependsOn rules (warning-level only).
 */

import { parsePath } from '@/lib/resolve-bindings'
import type { TrackerLike, ValidationContext, ValidatorResult } from '../types'

export function validateDependsOn(tracker: TrackerLike, ctx: ValidationContext): ValidatorResult {
  const warnings: string[] = []
  const rules = tracker.dependsOn ?? []

  if (!Array.isArray(rules) || rules.length === 0) return {}

  for (const [idx, rule] of rules.entries()) {
    if (!rule?.source) {
      warnings.push(`dependsOn[${idx}]: missing source`)
      continue
    }
    const sourceParsed = parsePath(rule.source)
    if (!sourceParsed.gridId || !ctx.gridIds.has(sourceParsed.gridId)) {
      warnings.push(`dependsOn[${idx}]: source grid "${sourceParsed.gridId}" not found`)
    }
    if (!sourceParsed.fieldId || !ctx.fieldIds.has(sourceParsed.fieldId)) {
      warnings.push(`dependsOn[${idx}]: source field "${sourceParsed.fieldId}" not found`)
    }
    const targets = rule.targets ?? []
    if (!Array.isArray(targets) || targets.length === 0) {
      warnings.push(`dependsOn[${idx}]: no targets provided`)
      continue
    }
    for (const target of targets) {
      const targetParsed = parsePath(target)
      if (!targetParsed.gridId || !ctx.gridIds.has(targetParsed.gridId)) {
        warnings.push(`dependsOn[${idx}]: target grid "${targetParsed.gridId}" not found`)
      }
      if (!targetParsed.fieldId || !ctx.fieldIds.has(targetParsed.fieldId)) {
        warnings.push(`dependsOn[${idx}]: target field "${targetParsed.fieldId}" not found`)
      }
    }
  }

  return { warnings }
}
