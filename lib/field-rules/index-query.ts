/**
 * Query the field rules index: get rules by grid or by source path.
 */

import type { FieldRuleIndex, EnrichedFieldRule, FieldRule } from './types'
import { buildFieldRuleIndex } from './index-build'

/** O(1) get rules that target the given grid. */
export function getRulesForGrid(
  index: FieldRuleIndex,
  gridId: string
): EnrichedFieldRule[] {
  return index.rulesByGridId.get(gridId) ?? []
}

/** O(1) get rules that use the given source path (for invalidation). */
export function getRulesForSource(
  index: FieldRuleIndex,
  sourcePath: string
): EnrichedFieldRule[] {
  return index.rulesBySource.get(sourcePath) ?? []
}

/** Filter rules to only those that target the given grid. */
export function filterFieldRulesForGrid(
  rules: FieldRule[] | undefined,
  gridId: string
): FieldRule[] {
  if (!rules || rules.length === 0) return []
  const index = buildFieldRuleIndex(rules)
  return getRulesForGrid(index, gridId)
}
