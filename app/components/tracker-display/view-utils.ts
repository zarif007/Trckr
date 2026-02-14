import type { TrackerGrid } from './types'
import type { GridType } from './types'
import { getViewLabel } from './constants'

export interface NormalizedView {
  id: string
  type: GridType
  name: string
  config: TrackerGrid['config']
}

/**
 * Normalizes grid.views or legacy grid.type into a list of views with id, type, name, config.
 */
export function normalizeGridViews(grid: TrackerGrid): NormalizedView[] {
  const rawViews = Array.isArray(grid.views) ? grid.views : []
  const fallbackViews =
    rawViews.length > 0
      ? rawViews
      : grid.type
        ? [{ type: grid.type, config: grid.config }]
        : [{ type: 'table' as const, config: grid.config }]

  return fallbackViews.map((view, index) => {
    const type = (view.type ?? 'table') as GridType
    const name = view.name ?? getViewLabel(type)
    const id = view.id ?? `${grid.id}_${type}_view_${index}`
    return {
      ...view,
      type,
      name,
      id,
      config: view.config ?? {},
    }
  })
}
