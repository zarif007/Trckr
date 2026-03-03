/**
 * Depends-on rule engine: types, index build/query, condition evaluation,
 * and resolution of field overrides from rules + grid data.
 *
 * Import from @/lib/depends-on.
 */

export type {
  DependsOnOperator,
  DependsOnAction,
  DependsOnRule,
  DependsOnRuleForTarget,
  DependsOnRules,
  ParsedPath,
  EnrichedDependsOnRule,
  FieldOverride,
  DependsOnIndex,
  ResolveDependsOnOptions,
} from './types'
export { getEffectiveDependsOn } from './effective'
export type { SchemaWithDependsOn } from './effective'

export { buildDependsOnIndex } from './index-build'
export {
  getRulesForGrid,
  getRulesForSource,
  filterDependsOnRulesForGrid,
} from './index-query'
export { applyFieldOverrides } from './overrides'
export { resolveDependsOnOverrides } from './resolve'
