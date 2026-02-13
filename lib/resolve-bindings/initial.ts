/**
 * Build initial grid data for option grids from bindings.
 * Option grids start empty; user adds options in Shared tab.
 */

import type { TrackerBindings } from '@/lib/types/tracker-bindings'
import type { GridData } from './grid-data'
import { parsePath } from './path'
import { normalizeOptionsGridId } from './path'

/**
 * Build initial grid data for all option grids referenced in bindings.
 * Each options grid is set to an empty array.
 */
export function getInitialGridDataFromBindings(bindings: TrackerBindings): GridData {
  const result: GridData = {}
  if (!bindings || Object.keys(bindings).length === 0) return result

  const gridMeta: Record<string, { labelFieldId: string; valueFieldId: string }> = {}

  for (const [fieldPath, entry] of Object.entries(bindings)) {
    const optionsGridId = normalizeOptionsGridId(entry.optionsGrid)
    if (!optionsGridId) continue

    const { fieldId: labelFieldId } = parsePath(entry.labelField)
    const valueMapping = entry.fieldMappings?.find((m) => m.to === fieldPath)
    const valueFieldId = valueMapping ? parsePath(valueMapping.from).fieldId : null
    if (!labelFieldId || !valueFieldId) continue

    if (!gridMeta[optionsGridId]) {
      gridMeta[optionsGridId] = { labelFieldId, valueFieldId }
    }
  }

  for (const optionsGridId of Object.keys(gridMeta)) {
    result[optionsGridId] = []
  }
  return result
}
