/**
 * Resolve which option-grid field holds the stored value for a select field.
 * Uses fieldMappings (to === selectFieldPath) or deprecated valueField / labelField.
 */

import type { TrackerBindingEntry, FieldPath } from '@/lib/types/tracker-bindings'
import { parsePath } from './path'

/** Binding that may have deprecated valueField (legacy). */
export type BindingWithOptionalValueField = TrackerBindingEntry & { valueField?: string }

/**
 * Get the option row field ID that provides the stored value for this select field.
 * Prefers fieldMapping where "to" === selectFieldPath; falls back to valueField then labelField.
 */
export function getValueFieldIdFromBinding(
  binding: BindingWithOptionalValueField,
  selectFieldPath: FieldPath
): string | null {
  const valueMapping = binding.fieldMappings?.find((m) => m.to === selectFieldPath)
  if (valueMapping) {
    const { fieldId } = parsePath(valueMapping.from)
    return fieldId
  }
  if (binding.valueField) {
    const { fieldId } = parsePath(binding.valueField)
    return fieldId
  }
  const { fieldId: labelFieldId } = parsePath(binding.labelField)
  return labelFieldId ?? null
}
