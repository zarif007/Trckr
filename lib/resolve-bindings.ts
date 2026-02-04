/**
 * Binding Resolution Engine
 * 
 * Handles dot-notation path parsing and safe value resolution for the bindings system.
 * All functions handle edge cases gracefully with warnings instead of errors.
 * 
 * Debug logging can be enabled by setting BINDING_DEBUG=true in localStorage or by calling enableBindingDebug()
 */

import type { TrackerBindingEntry, FieldPath, TrackerBindings } from '@/lib/types/tracker-bindings'

const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('BINDING_DEBUG') === 'true'
}

/** Enable binding debug logging (persists in localStorage) */
export function enableBindingDebug(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('BINDING_DEBUG', 'true')
    console.log('[Bindings] Debug mode enabled. Refresh to see detailed logs.')
  }
}

/** Disable binding debug logging */
export function disableBindingDebug(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('BINDING_DEBUG')
    console.log('[Bindings] Debug mode disabled.')
  }
}

const debugLog = (message: string, ...args: unknown[]): void => {
  if (isDebugEnabled()) {
    console.log(`[Bindings:DEBUG] ${message}`, ...args)
  }
}

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
  const gridId = binding.optionsGrid?.includes('.') ? binding.optionsGrid.split('.').pop()! : binding.optionsGrid
  const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)
  const { fieldId: labelFieldId } = parsePath(binding.labelField)

  debugLog('findOptionRow called', {
    selectFieldPath,
    selectedValue,
    gridId,
    valueFieldId,
    binding: { optionsGrid: binding.optionsGrid, labelField: binding.labelField, mappingsCount: binding.fieldMappings?.length }
  })

  if (!gridId) {
    console.warn(`[Bindings] Invalid binding - optionsGrid: "${binding.optionsGrid}"`)
    return undefined
  }
  if (!valueFieldId) {
    console.warn(`[Bindings] No value mapping for "${selectFieldPath}". Falling back to label/id matching.`)
  }

  const rows = gridData[gridId] ?? []
  debugLog(`Options grid "${gridId}" has ${rows.length} rows`, rows)

  const match = (rowVal: unknown, sel: unknown) =>
    rowVal === sel || String(rowVal) === String(sel)

  const vf: string | null = valueFieldId
  let foundRow =
    vf != null ? rows.find((row) => match(row[vf], selectedValue)) : undefined

  if (!foundRow && labelFieldId != null) {
    const lbl = labelFieldId
    foundRow = rows.find((row) => match(row[lbl], selectedValue))
    if (foundRow) {
      debugLog('Matched option row by label field', { labelFieldId, selectedValue })
    }
  }

  if (!foundRow) {
    const selectedString = String(selectedValue)
    if (selectedString.startsWith('opt-')) {
      const idx = Number(selectedString.slice(4))
      if (!Number.isNaN(idx) && idx >= 0 && idx < rows.length) {
        foundRow = rows[idx]
        debugLog('Matched option row by fallback opt-* index', { idx, selectedValue })
      }
    }
  }

  if (!foundRow) {
    foundRow = rows.find((row) => match((row as { id?: unknown }).id, selectedValue))
    if (foundRow) {
      debugLog('Matched option row by row.id', { selectedValue })
    }
  }

  if (foundRow) {
    debugLog('Found matching option row', foundRow)
  } else {
    debugLog(`No matching row found for value "${selectedValue}" in field "${vf}"`)
    debugLog('Available values:', vf != null ? rows.map((r) => r[vf]) : rows)
  }

  return foundRow
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

  debugLog('applyBindings called', {
    selectFieldPath,
    optionRowKeys: Object.keys(optionRow),
    mappingsCount: binding.fieldMappings?.length ?? 0
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
      console.warn(`[Bindings] Source field "${sourceFieldId}" not found in option row. Available fields: ${Object.keys(optionRow).join(', ')}`)
      debugLog(`Missing source field "${sourceFieldId}" for mapping ${mapping.from} -> ${mapping.to}`)
      continue
    }

    const update = {
      targetPath: mapping.to,
      value: optionRow[sourceFieldId],
    }
    debugLog(`Adding update: ${mapping.from} (${sourceFieldId}=${optionRow[sourceFieldId]}) -> ${mapping.to}`)
    updates.push(update)
  }

  debugLog(`applyBindings returning ${updates.length} updates`, updates)
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
  const gridId = binding.optionsGrid?.includes('.') ? binding.optionsGrid.split('.').pop()! : binding.optionsGrid
  const { fieldId: labelFieldId } = parsePath(binding.labelField)
  const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)

  debugLog('resolveOptionsFromBinding', {
    selectFieldPath,
    gridId,
    labelFieldId,
    valueFieldId,
    availableGrids: Object.keys(gridData)
  })

  if (!gridId || !labelFieldId || !valueFieldId) {
    debugLog('Missing required fields for options resolution')
    return []
  }

  const rows = gridData[gridId] ?? []
  const lbl = labelFieldId
  const vf = valueFieldId

  if (rows.length === 0) {
    debugLog('No rows in options grid, returning empty options')
    return []
  }

  const options = rows.map((row, i) => ({
    id: row.id != null ? String(row.id) : `opt-${i}`,
    label: String(row[lbl] ?? ''),
    value: row[vf],
  }))

  debugLog(`Resolved ${options.length} options`, options)
  return options
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

/**
 * Build initial grid data for option grids from bindings only. Option grids start empty; user adds options in Shared tab.
 */
export function getInitialGridDataFromBindings(
  bindings: TrackerBindings
): Record<string, Array<Record<string, unknown>>> {
  const result: Record<string, Array<Record<string, unknown>>> = {}
  if (!bindings || Object.keys(bindings).length === 0) return result

  const gridMeta: Record<string, { labelFieldId: string; valueFieldId: string }> = {}

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

  for (const [optionsGridId] of Object.entries(gridMeta)) {
    result[optionsGridId] = []
  }
  return result
}

