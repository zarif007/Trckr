/**
 * Field rules engine: expression-based conditional field behavior
 * (visibility, required, disabled, label, value).
 *
 * Import from @/lib/field-rules.
 */

export type {
  RuleProperty,
  NodeTriggerType,
  EngineType,
  FieldRule,
  FieldRulesMap,
  FieldRuleOverride,
  FieldRulesResult,
} from './types'
export { deriveEngineType } from './types'
export { resolveFieldRulesForRow } from './resolve'
export { applyFieldOverrides } from './overrides'
export { fieldRuleSchema, fieldRulesSchema } from './schema'
export { extractFieldRefsFromExpr } from './extract-field-refs'
