import { useMemo } from 'react'
import {
  buildDependsOnIndex,
  getRulesForGrid,
  type DependsOnRules,
  type EnrichedDependsOnRule,
  type DependsOnIndex,
} from '@/lib/depends-on'

/**
 * Returns the depends-on index and rules for a given grid.
 * Use this hook in grid components (TrackerTableGrid, TrackerKanbanGrid, TrackerDivGrid)
 * to avoid duplicating the same useMemo pattern.
 */
export function useGridDependsOn(
  gridId: string,
  dependsOn: DependsOnRules | undefined
): { dependsOnIndex: DependsOnIndex; dependsOnForGrid: EnrichedDependsOnRule[] } {
  const dependsOnIndex = useMemo(
    () => buildDependsOnIndex(dependsOn ?? []),
    [dependsOn]
  )
  const dependsOnForGrid = useMemo(
    () => getRulesForGrid(dependsOnIndex, gridId),
    [dependsOnIndex, gridId]
  )
  return { dependsOnIndex, dependsOnForGrid }
}
