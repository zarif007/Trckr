/**
 * Field rules engine: types, index build/query, condition evaluation,
 * and resolution of field overrides from rules + grid data.
 *
 * Import from @/lib/field-rules.
 */

export type {
  FieldRuleOperator,
  FieldRuleAction,
  FieldRule,
  FieldRuleForTarget,
  FieldRules,
  ParsedPath,
  EnrichedFieldRule,
  FieldOverride,
  FieldRuleIndex,
  ResolveFieldRuleOptions,
} from './types'
export { getEffectiveFieldRules } from './effective'
export type { SchemaWithFieldRules } from './effective'

export { buildFieldRuleIndex } from './index-build'
export {
  getRulesForGrid,
  getRulesForSource,
  filterFieldRulesForGrid,
} from './index-query'
export { applyFieldOverrides } from './overrides'
export { resolveFieldRuleOverrides } from './resolve'
