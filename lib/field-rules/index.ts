/**
 * Field rules engine: expression-based conditional field behavior
 * (visibility, required, disabled, label, options, value).
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
export { deriveEngineType, SYNC_TRIGGER_TYPES, ASYNC_TRIGGER_TYPES } from './types'
export { resolveFieldRulesForRow } from './resolve'
export { applyFieldOverrides } from './overrides'
export { fieldRuleSchema, fieldRulesSchema } from './schema'
