import type { TrackerGrid } from '../types'
import type { EntryWayConfig, EntryWayContext, EntryWayDefinition } from './entry-way-types'

/**
 * Build executable Entry Ways for a grid from its config.
 * For now, this is a thin wrapper that turns `defaults` into the new row body.
 */
export function buildEntryWaysForGrid(options: {
  grid: TrackerGrid
  tabId: string
}): EntryWayDefinition[] {
  const { grid, tabId } = options
  const configs = (grid.config?.entryWays ?? []) as EntryWayConfig[]
  if (!configs.length) return []

  return configs.map((config) => {
    const buildRow = (_ctx: EntryWayContext): Record<string, unknown> => {
      // Today: just return the configured defaults. This is where we can later
      // plug in computed values, timestamps, bindings, etc.
      return { ...(config.defaults ?? {}) }
    }

    return {
      id: config.id,
      label: config.label,
      description: config.description,
      config,
      buildRow,
    }
  })
}

