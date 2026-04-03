import type { GridDataSnapshot } from './types'
import { isNumericRowId } from './row-order-key'

/**
 * Assign numeric order keys: missing row_id, legacy string UUIDs, or non-numeric row_id
 * become 1..n by current array order.
 */
export function backfillRowIds(data: GridDataSnapshot): GridDataSnapshot {
 const result: GridDataSnapshot = {}
 for (const [gridId, rows] of Object.entries(data)) {
 if (!Array.isArray(rows)) {
 result[gridId] = rows
 continue
 }
 result[gridId] = rows.map((row, i) => {
 if (row != null && typeof row === 'object') {
 const rid = (row as Record<string, unknown>).row_id
 if (rid == null || typeof rid === 'string' || !isNumericRowId(rid)) {
 return { ...row, row_id: i + 1 }
 }
 }
 return row
 })
 }
 return result
}
