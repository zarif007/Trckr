// lib/validate-tracker/validators/field-rules.ts

import type { ValidationContext, ValidatorResult } from '../types'
import type { FieldRulesMap } from '@/lib/field-rules'
import { deriveEngineType } from '@/lib/field-rules'

/**
 * Validates fieldRulesV2 entries.
 * Issues warnings (not errors) to remain forward-compatible with new rule shapes.
 */
export function validateFieldRules(
 fieldRulesV2: FieldRulesMap | undefined,
 ctx: ValidationContext,
): ValidatorResult {
 if (!fieldRulesV2) return { errors: [], warnings: [] }

 const warnings: string[] = []
 const seenIds = new Map<string, Set<string>>()

 for (const [path, rules] of Object.entries(fieldRulesV2)) {
 const dotIdx = path.indexOf('.')
 if (dotIdx < 1) {
 warnings.push(`fieldRulesV2: key "${path}" must be "gridId.fieldId" format`)
 continue
 }
 const gridId = path.slice(0, dotIdx)
 const fieldId = path.slice(dotIdx + 1)

 if (!ctx.gridIds.has(gridId)) {
 warnings.push(`fieldRulesV2: key "${path}" references unknown grid "${gridId}"`)
 }
 if (!ctx.fieldPaths.has(path)) {
 warnings.push(`fieldRulesV2: key "${path}" references unknown field "${fieldId}" in grid "${gridId}"`)
 }

 const idsForPath = seenIds.get(path) ?? new Set()
 seenIds.set(path, idsForPath)

 for (const rule of rules) {
 if (!rule.id) {
 warnings.push(`fieldRulesV2["${path}"]: rule is missing required "id"`)
 } else if (idsForPath.has(rule.id)) {
 warnings.push(`fieldRulesV2["${path}"]: duplicate rule id "${rule.id}"`)
 } else {
 idsForPath.add(rule.id)
 }

 if (!rule.outcome) {
 warnings.push(`fieldRulesV2["${path}"] rule "${rule.id}": missing "outcome" expression`)
 }

 const expectedEngine = deriveEngineType(rule.property)
 if (rule.engineType !== expectedEngine) {
 warnings.push(
 `fieldRulesV2["${path}"] rule "${rule.id}": engineType "${rule.engineType}" does not match property "${rule.property}" (expected "${expectedEngine}")`,
 )
 }
 }
 }

 return { errors: [], warnings }
}
