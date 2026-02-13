/**
 * Apply bindings: compute target field updates from a selected option row.
 * Does not include the select field itself (set by the select onChange).
 */

import type { TrackerBindingEntry, FieldPath } from '@/lib/types/tracker-bindings'
import { parsePath } from './path'
import { debugLog } from './debug'

export interface BindingUpdate {
  targetPath: FieldPath
  value: unknown
}

/**
 * Get updates for target fields from the selected option row.
 * Skips the mapping that targets the select field itself.
 */
export function applyBindings(
  binding: TrackerBindingEntry,
  optionRow: Record<string, unknown>,
  selectFieldPath: FieldPath
): BindingUpdate[] {
  const updates: BindingUpdate[] = []

  debugLog('applyBindings called', {
    selectFieldPath,
    optionRowKeys: Object.keys(optionRow),
    mappingsCount: binding.fieldMappings?.length ?? 0,
  })

  for (const mapping of binding.fieldMappings ?? []) {
    if (mapping.to === selectFieldPath) {
      debugLog(`Skipping value mapping: ${mapping.from} -> ${mapping.to} (select field itself)`)
      continue
    }

    const { fieldId: sourceFieldId } = parsePath(mapping.from)

    if (!sourceFieldId) {
      console.warn(`[Bindings] Invalid source path: "${mapping.from}"`)
      continue
    }

    if (!(sourceFieldId in optionRow)) {
      console.warn(
        `[Bindings] Source field "${sourceFieldId}" not found in option row. Available: ${Object.keys(optionRow).join(', ')}`
      )
      debugLog(`Missing source field "${sourceFieldId}" for mapping ${mapping.from} -> ${mapping.to}`)
      continue
    }

    updates.push({
      targetPath: mapping.to,
      value: optionRow[sourceFieldId],
    })
    debugLog(`Adding update: ${mapping.from} (${sourceFieldId}=${optionRow[sourceFieldId]}) -> ${mapping.to}`)
  }

  debugLog(`applyBindings returning ${updates.length} updates`, updates)
  return updates
}
