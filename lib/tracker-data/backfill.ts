import type { GridDataSnapshot } from './types'

/**
 * Backfill row_id for rows that don't have it.
 * Returns a new GridDataSnapshot; does not mutate the input.
 * Used when loading existing data so UI and diff work correctly.
 */
export function backfillRowIds(data: GridDataSnapshot): GridDataSnapshot {
  const result: GridDataSnapshot = {}
  for (const [gridId, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) {
      result[gridId] = rows
      continue
    }
    result[gridId] = rows.map((row) => {
      if (row != null && typeof row === 'object' && row.row_id == null) {
        return { ...row, row_id: crypto.randomUUID() }
      }
      return row
    })
  }
  return result
}
