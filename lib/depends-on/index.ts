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
  DependsOnRules,
  ParsedPath,
  EnrichedDependsOnRule,
  FieldOverride,
  DependsOnIndex,
  ResolveDependsOnOptions,
} from './types'

export { buildDependsOnIndex } from './index-build'
export {
  getRulesForGrid,
  getRulesForSource,
  filterDependsOnRulesForGrid,
} from './index-query'
export { applyFieldOverrides } from './overrides'
export { resolveDependsOnOverrides } from './resolve'
