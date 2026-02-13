/**
 * Dot-notation path parsing and building for bindings.
 * Path format: "grid_id.field_id" (no tab) or legacy "tab.grid.field".
 */

import type { FieldPath } from '@/lib/types/tracker-bindings'
import type { ParsedPath } from './types'

/**
 * Parse a path: "grid_id.field_id" or "grid_id" (options grid only).
 * Supports legacy 3-part "tab.grid.field" format.
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

/** Build field path: "grid_id.field_id". */
export function buildFieldPath(gridId: string, fieldId: string): FieldPath {
  return `${gridId}.${fieldId}`
}

/** Normalize optionsGrid string to grid id (strip tab prefix if present). */
export function normalizeOptionsGridId(optionsGrid: string | undefined): string | undefined {
  if (!optionsGrid) return undefined
  return optionsGrid.includes('.') ? optionsGrid.split('.').pop()! : optionsGrid
}
