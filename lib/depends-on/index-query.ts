/**
 * Query the depends-on index: get rules by grid or by source path.
 */

import type { DependsOnIndex, EnrichedDependsOnRule, DependsOnRule } from './types'
import { buildDependsOnIndex } from './index-build'

/** O(1) get rules that target the given grid. */
export function getRulesForGrid(
  index: DependsOnIndex,
  gridId: string
): EnrichedDependsOnRule[] {
  return index.rulesByGridId.get(gridId) ?? []
}

/** O(1) get rules that depend on the given source path (for invalidation). */
export function getRulesForSource(
  index: DependsOnIndex,
  sourcePath: string
): EnrichedDependsOnRule[] {
  return index.rulesBySource.get(sourcePath) ?? []
}

/** Filter rules to only those that target the given grid. */
export function filterDependsOnRulesForGrid(
  rules: DependsOnRule[] | undefined,
  gridId: string
): DependsOnRule[] {
  if (!rules || rules.length === 0) return []
  const index = buildDependsOnIndex(rules)
  return getRulesForGrid(index, gridId)
}
