/**
 * Validates fieldRules (warning-level only).
 */

import { parsePath } from '@/lib/resolve-bindings'
import type { TrackerLike, ValidationContext, ValidatorResult } from '../types'

export function validateFieldRules(tracker: TrackerLike, ctx: ValidationContext): ValidatorResult {
  const warnings: string[] = []
  const rules = tracker.fieldRules ?? []

  if (!Array.isArray(rules) || rules.length === 0) return {}

  for (const [idx, rule] of rules.entries()) {
    if (!rule?.source) {
      warnings.push(`fieldRules[${idx}]: missing source`)
      continue
    }
    const sourceParsed = parsePath(rule.source)
    if (!sourceParsed.gridId || !ctx.gridIds.has(sourceParsed.gridId)) {
      warnings.push(`fieldRules[${idx}]: source grid "${sourceParsed.gridId}" not found`)
    }
    if (!sourceParsed.fieldId || !ctx.fieldIds.has(sourceParsed.fieldId)) {
      warnings.push(`fieldRules[${idx}]: source field "${sourceParsed.fieldId}" not found`)
    }
    const targets = rule.targets ?? []
    if (!Array.isArray(targets) || targets.length === 0) {
      warnings.push(`fieldRules[${idx}]: no targets provided`)
      continue
    }
    for (const target of targets) {
      const targetParsed = parsePath(target)
      if (!targetParsed.gridId || !ctx.gridIds.has(targetParsed.gridId)) {
        warnings.push(`fieldRules[${idx}]: target grid "${targetParsed.gridId}" not found`)
      }
      if (!targetParsed.fieldId || !ctx.fieldIds.has(targetParsed.fieldId)) {
        warnings.push(`fieldRules[${idx}]: target field "${targetParsed.fieldId}" not found`)
      }
    }
  }

  return { warnings }
}
