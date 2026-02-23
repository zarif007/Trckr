/**
 * Dynamic options: all grids (tables) with value = grid id, label = grid name.
 * Used e.g. by the Bindings grid to pick an options grid.
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_grids'

export function allGrids(context: DynamicOptionsContext): DynamicOption[] {
  const { grids } = context
  return (grids ?? []).map((g) => ({
    value: g.id,
    label: g.name ?? g.id,
    id: g.id,
  }))
}
