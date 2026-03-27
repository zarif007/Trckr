import { useMemo } from 'react'
import {
  buildFieldRuleIndex,
  getRulesForGrid,
  type FieldRules,
  type EnrichedFieldRule,
  type FieldRuleIndex,
} from '@/lib/field-rules'

/**
 * Returns the field rules index and rules for a given grid.
 * Use this hook in grid components (TrackerTableGrid, TrackerKanbanGrid, TrackerDivGrid)
 * to avoid duplicating the same useMemo pattern.
 */
export function useGridFieldRules(
  gridId: string,
  fieldRules: FieldRules | undefined
): { fieldRuleIndex: FieldRuleIndex; rulesForGrid: EnrichedFieldRule[] } {
  const fieldRuleIndex = useMemo(
    () => buildFieldRuleIndex(fieldRules ?? []),
    [fieldRules]
  )
  const rulesForGrid = useMemo(
    () => getRulesForGrid(fieldRuleIndex, gridId),
    [fieldRuleIndex, gridId]
  )
  return { fieldRuleIndex, rulesForGrid }
}
