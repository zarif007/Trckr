/**
 * Binding Resolution Engine
 * 
 * Handles dot-notation path parsing and safe value resolution for the bindings system.
 * All functions handle edge cases gracefully with warnings instead of errors.
 */

import type { TrackerBindingEntry, FieldPath, TrackerBindings } from '@/app/components/tracker-display/types'

/**
 * Parsed path components. Path format is grid.field (no tab).
 */
export interface ParsedPath {
  tabId: null
  gridId: string | null
  fieldId: string | null
}

/**
 * Parse a path: "grid_id.field_id" or "grid_id" (options grid only).
 *
 * @example
 * parsePath("product_options_grid.label") => { gridId: "product_options_grid", fieldId: "label" }
 * parsePath("orders_grid.product") => { gridId: "orders_grid", fieldId: "product" }
 * parsePath("product_options_grid") => { gridId: "product_options_grid", fieldId: null }
 */
export function parsePath(path: string): ParsedPath {
  if (!path || typeof path !== 'string') {
    console.warn(`[Bindings] Invalid path: "${path}"`)
    return { tabId: null, gridId: null, fieldId: null }
  }

  const parts = path.split('.')

  if (parts.length === 2) {
    return { tabId: null, gridId: parts[0], fieldId: parts[1] }
  }

  if (parts.length === 1) {
    return { tabId: null, gridId: parts[0], fieldId: null }
  }

  // Backward compat: allow old tab.grid.field (3 parts) - treat as grid.field by dropping first part
  if (parts.length === 3) {
    return { tabId: null, gridId: parts[1], fieldId: parts[2] }
  }

  console.warn(`[Bindings] Invalid path format (expected 1-2 parts, or 3 for legacy): "${path}"`)
  return { tabId: null, gridId: null, fieldId: null }
}

/**
 * Build field path: "grid_id.field_id" (no tab).
 */
export function buildFieldPath(gridId: string, fieldId: string): FieldPath {
  return `${gridId}.${fieldId}`
}

/**
 * Get value from gridData using a full field path.
 * Returns undefined if path is invalid or value doesn't exist.
 * 
 * @param gridData - The grid data state
 * @param path - Full field path: "tab_id.grid_id.field_id"
 * @param rowIndex - Row index in the grid
 */
export function getValueByPath(
  gridData: Record<string, Array<Record<string, unknown>>>,
  path: FieldPath,
  rowIndex: number
): unknown | undefined {
  const { gridId, fieldId } = parsePath(path)

  if (!gridId || !fieldId) {
    return undefined
  }

  const rows = gridData[gridId]
  if (!rows || !rows[rowIndex]) {
    return undefined
  }

  return rows[rowIndex][fieldId]
}

/**
 * Set a value in gridData using a full field path.
 * Returns a new gridData object with the update applied.
 * 
 * @param gridData - The current grid data state
 * @param path - Full field path: "tab_id.grid_id.field_id"
 * @param rowIndex - Row index in the grid
 * @param value - The value to set
 */
export function setValueByPath(
  gridData: Record<string, Array<Record<string, unknown>>>,
  path: FieldPath,
  rowIndex: number,
  value: unknown
): Record<string, Array<Record<string, unknown>>> {
  const { gridId, fieldId } = parsePath(path)

  if (!gridId || !fieldId) {
    console.warn(`[Bindings] Cannot set value - invalid path: "${path}"`)
    return gridData
  }

  const rows = gridData[gridId] ?? []
  if (rowIndex < 0 || rowIndex >= rows.length) {
    console.warn(`[Bindings] Cannot set value - invalid row index: ${rowIndex} for grid "${gridId}"`)
    return gridData
  }

  const newRows = [...rows]
  newRows[rowIndex] = { ...newRows[rowIndex], [fieldId]: value }

  return { ...gridData, [gridId]: newRows }
}

/**
 * Get the option row field ID that provides the stored value for this select field.
 * The value is the "from" of the fieldMapping whose "to" equals the select field path.
 * Backward compat: if binding has valueField (deprecated), use that.
 */
export function getValueFieldIdFromBinding(
  binding: TrackerBindingEntry & { valueField?: string },
  selectFieldPath: FieldPath
): string | null {
  const valueMapping = binding.fieldMappings?.find((m) => m.to === selectFieldPath)
  if (valueMapping) {
    const { fieldId } = parsePath(valueMapping.from)
    return fieldId
  }
  // Backward compat: legacy valueField
  if (binding.valueField) {
    const { fieldId } = parsePath(binding.valueField)
    return fieldId
  }
  return null
}

/**
 * Find the row in options grid that matches the selected value.
 * Uses the fieldMapping where "to" === selectFieldPath to get the value field.
 *
 * @param gridData - The grid data state
 * @param binding - The binding entry for the select field
 * @param selectedValue - The value that was selected
 * @param selectFieldPath - Full path to the select field (e.g. "orders_tab.orders_grid.product")
 */
export function findOptionRow(
  gridData: Record<string, Array<Record<string, unknown>>>,
  binding: TrackerBindingEntry,
  selectedValue: unknown,
  selectFieldPath: FieldPath
): Record<string, unknown> | undefined {
  // optionsGrid: grid id only, or legacy "tab.grid" - gridData is keyed by grid id
  const gridId = binding.optionsGrid?.includes('.') ? binding.optionsGrid.split('.').pop()! : binding.optionsGrid
  const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)

  if (!gridId || !valueFieldId) {
    console.warn(`[Bindings] Invalid binding - optionsGrid: "${binding.optionsGrid}" or no value mapping for "${selectFieldPath}"`)
    return undefined
  }

  const rows = gridData[gridId] ?? []
  // Use loose equality so string "123" matches number 123 (select components often stringify)
  const match = (rowVal: unknown, sel: unknown) =>
    rowVal === sel || String(rowVal) === String(sel)
  return rows.find((row) => match(row[valueFieldId], selectedValue))
}

/**
 * Apply bindings: get values from selected option row and return updates for target fields.
 * Does not include the select field itself (that value is set by the select onChange).
 * Safely handles missing fields with warnings.
 *
 * @param binding - The binding entry for the select field
 * @param optionRow - The selected option row data
 * @param selectFieldPath - Full path to the select field (skip mapping that targets this)
 */
export function applyBindings(
  binding: TrackerBindingEntry,
  optionRow: Record<string, unknown>,
  selectFieldPath: FieldPath
): Array<{ targetPath: FieldPath; value: unknown }> {
  const updates: Array<{ targetPath: FieldPath; value: unknown }> = []

  for (const mapping of binding.fieldMappings ?? []) {
    // Skip the "value" mapping (to === select field) - that is set by the select itself
    if (mapping.to === selectFieldPath) continue

    const { fieldId: sourceFieldId } = parsePath(mapping.from)

    if (!sourceFieldId) {
      console.warn(`[Bindings] Invalid source path: "${mapping.from}"`)
      continue
    }

    if (!(sourceFieldId in optionRow)) {
      console.warn(`[Bindings] Source field "${sourceFieldId}" not found in option row`)
      continue
    }

    updates.push({
      targetPath: mapping.to,
      value: optionRow[sourceFieldId],
    })
  }

  return updates
}

/**
 * Resolve options for a select field using bindings.
 * Returns normalized options array for the Select/MultiSelect component.
 * The value comes from the fieldMapping where "to" === selectFieldPath.
 *
 * @param binding - The binding entry for the select field
 * @param gridData - The grid data state
 * @param selectFieldPath - Full path to the select field (e.g. "orders_tab.orders_grid.product")
 */
export function resolveOptionsFromBinding(
  binding: TrackerBindingEntry,
  gridData: Record<string, Array<Record<string, unknown>>>,
  selectFieldPath: FieldPath
): Array<{ id: string; label: string; value: unknown }> {
  // optionsGrid: grid id only, or legacy "tab.grid" - gridData is keyed by grid id
  const gridId = binding.optionsGrid?.includes('.') ? binding.optionsGrid.split('.').pop()! : binding.optionsGrid
  const { fieldId: labelFieldId } = parsePath(binding.labelField)
  const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)

  if (!gridId || !labelFieldId || !valueFieldId) {
    return []
  }

  const rows = gridData[gridId] ?? []

  if (rows.length === 0) {
    return PLACEHOLDER_OPTIONS.map((opt, i) => ({
      id: String(opt.value),
      label: opt.label,
      value: opt.value,
    }))
  }

  return rows.map((row, i) => ({
    id: row.id != null ? String(row.id) : `opt-${i}`,
    label: String(row[labelFieldId] ?? ''),
    value: row[valueFieldId],
  }))
}

/**
 * Get the binding entry for a specific field.
 * Key is "grid_id.field_id" (no tab). Also tries legacy "tab.grid.field" key if provided.
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
  // Backward compat: try tab.grid.field if grid.field not found
  if (!entry && tabId) {
    const legacyPath = `${tabId}.${gridId}.${fieldId}` as FieldPath
    entry = bindings[legacyPath]
  }
  return entry
}

/**
 * Check if a field has a binding entry.
 */
export function hasBinding(
  gridId: string,
  fieldId: string,
  bindings?: TrackerBindings
): boolean {
  return getBindingForField(gridId, fieldId, bindings) !== undefined
}

/**
 * Get all option rows from a binding (returns full row data, not just label/value).
 * Useful when you need access to all fields in the options grid.
 */
export function getFullOptionRows(
  binding: TrackerBindingEntry,
  gridData: Record<string, Array<Record<string, unknown>>>
): Array<Record<string, unknown>> {
  const gridId = binding.optionsGrid?.includes('.') ? binding.optionsGrid.split('.').pop()! : binding.optionsGrid
  if (!gridId) return []
  return gridData[gridId] ?? []
}

const PLACEHOLDER_OPTIONS = [
  { label: 'Option 1', value: 'opt_1' },
  { label: 'Option 2', value: 'opt_2' },
  { label: 'Option 3', value: 'opt_3' },
]

/**
 * Build initial grid data for option grids from bindings only. Seeds placeholder rows so dropdowns show options; user can edit in Shared tab.
 */
export function getInitialGridDataFromBindings(
  bindings: TrackerBindings
): Record<string, Array<Record<string, unknown>>> {
  const result: Record<string, Array<Record<string, unknown>>> = {}
  if (!bindings || Object.keys(bindings).length === 0) return result

  const gridMeta: Record<
    string,
    { labelFieldId: string; valueFieldId: string }
  > = {}
  for (const [fieldPath, entry] of Object.entries(bindings)) {
    const optionsGridId = entry.optionsGrid?.includes('.') ? entry.optionsGrid.split('.').pop()! : entry.optionsGrid
    if (!optionsGridId) continue

    const { fieldId: labelFieldId } = parsePath(entry.labelField)
    const valueMapping = entry.fieldMappings?.find((m) => m.to === fieldPath)
    const valueFieldId = valueMapping ? parsePath(valueMapping.from).fieldId : null
    if (!labelFieldId || !valueFieldId) continue

    if (!gridMeta[optionsGridId]) {
      gridMeta[optionsGridId] = { labelFieldId, valueFieldId }
    }
  }

  for (const [optionsGridId, meta] of Object.entries(gridMeta)) {
    const { labelFieldId, valueFieldId } = meta
    result[optionsGridId] = PLACEHOLDER_OPTIONS.map((opt) => ({
      [labelFieldId]: opt.label,
      [valueFieldId]: opt.value,
      id: String(opt.value),
    }))
  }
  return result
}

