import type { GridDataSnapshot } from './types'

/**
 * Ensures value is a plain object and each value is an array of plain objects.
 * Matches the in-memory grid data shape used by TrackerDisplayInline.
 */
export function validateGridDataSnapshot(
 value: unknown
): value is GridDataSnapshot {
 if (value === null || typeof value !== 'object' || Array.isArray(value)) {
 return false
 }
 const obj = value as Record<string, unknown>
 for (const key of Object.keys(obj)) {
 const v = obj[key]
 if (!Array.isArray(v)) return false
 for (let i = 0; i < v.length; i++) {
 const row = v[i]
 if (row === null || typeof row !== 'object' || Array.isArray(row)) {
 return false
 }
 }
 }
 return true
}
