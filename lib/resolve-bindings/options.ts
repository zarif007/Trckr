/**
 * Resolve select options from bindings and find the option row for a selected value.
 * Handles value/label/id and opt-N fallback matching.
 */

import type { TrackerBindingEntry, FieldPath } from '@/lib/types/tracker-bindings'
import type { GridData } from './grid-data'
import { parsePath } from './path'
import { normalizeOptionsGridId } from './path'
import { getValueFieldIdFromBinding } from './value-field'
import { debugLog } from './debug'

function matchValue(rowVal: unknown, selected: unknown): boolean {
  return rowVal === selected || String(rowVal) === String(selected)
}

/**
 * Find the row in the options grid that matches the selected value.
 * Tries: value field → label field → opt-N index → row.id.
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

  let foundRow =
    valueFieldId != null
      ? rows.find((row) => matchValue(row[valueFieldId], selectedValue))
      : undefined

  if (!foundRow && labelFieldId != null) {
    foundRow = rows.find((row) => matchValue(row[labelFieldId], selectedValue))
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
    foundRow = rows.find((row) => matchValue((row as { id?: unknown }).id, selectedValue))
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

export interface ResolvedOption {
  id: string
  label: string
  value: unknown
}

/**
 * Resolve options for a select field from bindings.
 * Returns normalized options for Select/MultiSelect (id, label, value).
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
 */
export function getFullOptionRows(
  binding: TrackerBindingEntry,
  gridData: GridData
): Array<Record<string, unknown>> {
  const gridId = normalizeOptionsGridId(binding.optionsGrid)
  if (!gridId) return []
  return gridData[gridId] ?? []
}
