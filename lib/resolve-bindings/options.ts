/**
 * Binding Resolution: Options
 * 
 * Resolve select options from bindings and find the option row for a selected value.
 * Handles value/label/id and opt-N fallback matching with caching for performance.
 * 
 * @module resolve-bindings/options
 * 
 * Performance optimizations:
 * - Indexed lookup for option rows (O(1) vs O(n) linear search)
 * - Cached resolved options per binding + grid data signature
 * - Memoized option row lookups
 */

import type { TrackerBindingEntry, FieldPath } from '@/lib/types/tracker-bindings'
import type { GridData } from './grid-data'
import { parsePath } from './path'
import { normalizeOptionsGridId } from './path'
import { getValueFieldIdFromBinding } from './value-field'
import { debugLog } from './debug'

// ============================================================================
// Option Row Index (for O(1) lookups)
// ============================================================================

/** Indexed option rows for fast lookup */
interface OptionRowIndex {
  byValue: Map<unknown, Record<string, unknown>>
  byLabel: Map<string, Record<string, unknown>>
  byId: Map<unknown, Record<string, unknown>>
  byIndex: Record<string, unknown>[]
}

/** Cache for option row indexes */
const optionRowIndexCache = new WeakMap<
  Record<string, unknown>[],
  Map<string, OptionRowIndex>
>()

/**
 * Build an indexed structure for fast option row lookups.
 * @internal
 */
function buildOptionRowIndex(
  rows: Record<string, unknown>[],
  valueFieldId: string | null,
  labelFieldId: string | null
): OptionRowIndex {
  const byValue = new Map<unknown, Record<string, unknown>>()
  const byLabel = new Map<string, Record<string, unknown>>()
  const byId = new Map<unknown, Record<string, unknown>>()
  
  for (const row of rows) {
    // Index by value field
    if (valueFieldId && row[valueFieldId] !== undefined) {
      byValue.set(row[valueFieldId], row)
      byValue.set(String(row[valueFieldId]), row)
    }
    // Index by label field
    if (labelFieldId && row[labelFieldId] !== undefined) {
      byLabel.set(String(row[labelFieldId]), row)
    }
    // Index by id
    const rowId = (row as { id?: unknown }).id
    if (rowId !== undefined) {
      byId.set(rowId, row)
      byId.set(String(rowId), row)
    }
  }
  
  return { byValue, byLabel, byId, byIndex: rows }
}

/**
 * Get or create cached option row index.
 * @internal
 */
function getCachedOptionRowIndex(
  rows: Record<string, unknown>[],
  valueFieldId: string | null,
  labelFieldId: string | null
): OptionRowIndex {
  const cacheKey = `${valueFieldId ?? ''}|${labelFieldId ?? ''}`
  let byBinding = optionRowIndexCache.get(rows)
  
  if (!byBinding) {
    byBinding = new Map()
    optionRowIndexCache.set(rows, byBinding)
  }
  
  let index = byBinding.get(cacheKey)
  if (!index) {
    index = buildOptionRowIndex(rows, valueFieldId, labelFieldId)
    byBinding.set(cacheKey, index)
  }
  
  return index
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Match a selected value against a row value.
 * Handles both strict equality and string coercion.
 */
function matchValue(rowVal: unknown, selected: unknown): boolean {
  return rowVal === selected || String(rowVal) === String(selected)
}

/**
 * Find the row in the options grid that matches the selected value.
 * Uses indexed lookup for O(1) performance when possible.
 * 
 * Lookup order:
 * 1. Value field (via index)
 * 2. Label field (via index)
 * 3. opt-N index fallback
 * 4. Row id (via index)
 * 
 * @param gridData - All grid data
 * @param binding - Binding configuration
 * @param selectedValue - Value to find
 * @param selectFieldPath - Path to the select field
 * @returns Matching option row or undefined
 * 
 * @example
 * ```ts
 * const row = findOptionRow(gridData, binding, 'USD', 'form.currency');
 * // Returns the row from options grid where value field matches 'USD'
 * ```
 */
export function findOptionRow(
  gridData: GridData,
  binding: TrackerBindingEntry,
  selectedValue: unknown,
  selectFieldPath: FieldPath
): Record<string, unknown> | undefined {
  const gridId = normalizeOptionsGridId(binding.optionsGrid)
  const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)
  const { fieldId: labelFieldId } = parsePath(binding.labelField)

  debugLog('findOptionRow called', {
    selectFieldPath,
    selectedValue,
    gridId,
    valueFieldId,
    binding: {
      optionsGrid: binding.optionsGrid,
      labelField: binding.labelField,
      mappingsCount: binding.fieldMappings?.length,
    },
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

  // Use indexed lookup for O(1) performance
  const index = getCachedOptionRowIndex(rows, valueFieldId, labelFieldId)
  let foundRow: Record<string, unknown> | undefined

  // 1. Try indexed lookup by value field
  if (valueFieldId != null) {
    foundRow = index.byValue.get(selectedValue) ?? index.byValue.get(String(selectedValue))
  }

  // 2. Try indexed lookup by label field
  if (!foundRow && labelFieldId != null) {
    foundRow = index.byLabel.get(String(selectedValue))
    if (foundRow) {
      debugLog('Matched option row by label field', { labelFieldId, selectedValue })
    }
  }

  // 3. Try opt-N index fallback (O(1))
  if (!foundRow) {
    const selectedString = String(selectedValue)
    if (selectedString.startsWith('opt-')) {
      const idx = Number(selectedString.slice(4))
      if (!Number.isNaN(idx) && idx >= 0 && idx < index.byIndex.length) {
        foundRow = index.byIndex[idx]
        debugLog('Matched option row by fallback opt-* index', { idx, selectedValue })
      }
    }
  }

  // 4. Try indexed lookup by row.id
  if (!foundRow) {
    foundRow = index.byId.get(selectedValue) ?? index.byId.get(String(selectedValue))
    if (foundRow) {
      debugLog('Matched option row by row.id', { selectedValue })
    }
  }

  if (foundRow) {
    debugLog('Found matching option row', foundRow)
  } else {
    debugLog(
      `No matching row found for value "${selectedValue}" in field "${valueFieldId}"`
    )
    debugLog(
      'Available values:',
      valueFieldId != null ? rows.map((r) => r[valueFieldId]) : rows
    )
  }

  return foundRow
}

/** Normalized option structure for UI components */
export interface ResolvedOption {
  /** Unique identifier (row.id or opt-N fallback) */
  id: string
  /** Display label */
  label: string
  /** Actual value to store */
  value: unknown
}

/**
 * Resolve options for a select field from bindings.
 * Returns normalized options ready for Select/MultiSelect UI components.
 * 
 * @param binding - Binding configuration specifying options grid and fields
 * @param gridData - All grid data containing the options rows
 * @param selectFieldPath - Path to the select field being configured
 * @returns Array of normalized options with id, label, and value
 * 
 * @example
 * ```ts
 * const options = resolveOptionsFromBinding(binding, gridData, 'form.status');
 * // Returns [{ id: 'opt-0', label: 'Active', value: 'active' }, ...]
 * ```
 */
export function resolveOptionsFromBinding(
  binding: TrackerBindingEntry,
  gridData: GridData,
  selectFieldPath: FieldPath
): ResolvedOption[] {
  const gridId = normalizeOptionsGridId(binding.optionsGrid)
  const { fieldId: labelFieldId } = parsePath(binding.labelField)
  const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)

  debugLog('resolveOptionsFromBinding', {
    selectFieldPath,
    gridId,
    labelFieldId,
    valueFieldId,
    availableGrids: Object.keys(gridData),
  })

  if (!gridId || !labelFieldId || !valueFieldId) {
    debugLog('Missing required fields for options resolution')
    return []
  }

  const rows = gridData[gridId] ?? []

  if (rows.length === 0) {
    debugLog('No rows in options grid, returning empty options')
    return []
  }

  return rows.map((row, i) => {
    const val = row[valueFieldId]
    const display = String(row[labelFieldId] ?? val ?? '')
    return {
      id: row.id != null ? String(row.id) : `opt-${i}`,
      label: display,
      value: val,
    }
  })
}

/**
 * Get all option rows from a binding (full row data).
 * Useful when you need complete row access beyond just label/value.
 * 
 * @param binding - Binding configuration
 * @param gridData - All grid data
 * @returns Array of complete row objects from the options grid
 */
export function getFullOptionRows(
  binding: TrackerBindingEntry,
  gridData: GridData
): Array<Record<string, unknown>> {
  const gridId = normalizeOptionsGridId(binding.optionsGrid)
  if (!gridId) return []
  return gridData[gridId] ?? []
}
