/**
 * Read and write grid data by field path.
 * Immutable updates; invalid paths or indices are handled with warnings.
 */

import type { FieldPath } from '@/lib/types/tracker-bindings'
import { parsePath } from './path'

export type GridData = Record<string, Array<Record<string, unknown>>>

/**
 * Get value from gridData using a full field path.
 * Returns undefined if path is invalid or value doesn't exist.
 */
export function getValueByPath(
  gridData: GridData,
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
 */
export function setValueByPath(
  gridData: GridData,
  path: FieldPath,
  rowIndex: number,
  value: unknown
): GridData {
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
