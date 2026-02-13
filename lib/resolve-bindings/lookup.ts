/**
 * Look up binding entries by grid and field.
 * Supports current "grid_id.field_id" key and legacy "tab.grid.field" key.
 */

import type { TrackerBindings, TrackerBindingEntry, FieldPath } from '@/lib/types/tracker-bindings'
import { buildFieldPath } from './path'

/**
 * Get the binding entry for a specific field.
 * Key is "grid_id.field_id"; also tries legacy "tab.grid.field" if tabId is provided.
 */
export function getBindingForField(
  gridId: string,
  fieldId: string,
  bindings?: TrackerBindings,
  tabId?: string
): TrackerBindingEntry | undefined {
  if (!bindings) return undefined

  const fieldPath = buildFieldPath(gridId, fieldId)
  let entry = bindings[fieldPath]
  if (!entry && tabId) {
    const legacyPath = `${tabId}.${gridId}.${fieldId}` as FieldPath
    entry = bindings[legacyPath]
  }
  return entry
}

/** Check if a field has a binding entry. */
export function hasBinding(
  gridId: string,
  fieldId: string,
  bindings?: TrackerBindings
): boolean {
  return getBindingForField(gridId, fieldId, bindings) !== undefined
}
