/**
 * Build a new option row for adding to an options grid.
 * Uses binding's labelField and value field from fieldMappings.
 */

import type { TrackerBindingEntry, FieldPath } from '@/lib/types/tracker-bindings'
import { parsePath, normalizeOptionsGridId } from './path'
import { getValueFieldIdFromBinding } from './value-field'

export interface NewOptionRowResult {
  optionsGridId: string
  newRow: Record<string, unknown>
}

/**
 * Build a new option row to add to an options grid.
 * @returns Object with optionsGridId and newRow to pass to onAddEntry(gridId, newRow).
 */
export function buildNewOptionRow(
  binding: TrackerBindingEntry,
  selectFieldPath: FieldPath,
  label: string,
  value?: string
): NewOptionRowResult {
  const optionsGridId = normalizeOptionsGridId(binding.optionsGrid)
  const { fieldId: labelFieldId } = parsePath(binding.labelField)
  const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)
  const storedValue = value ?? label

  if (!optionsGridId || !labelFieldId || !valueFieldId) {
    return { optionsGridId: optionsGridId ?? '', newRow: {} }
  }

  const newRow: Record<string, unknown> = {
    [labelFieldId]: label,
    [valueFieldId]: storedValue,
  }
  return { optionsGridId, newRow }
}
