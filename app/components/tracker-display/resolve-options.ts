import type { TrackerField, TrackerOption } from './types'

type GridRow = Record<string, unknown> & { label?: unknown; value?: unknown }
type GridData = Record<string, Array<GridRow>> | undefined

function toStringOrEmpty(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

/**
 * Resolves selectable options for a field.
 *
 * - Prefer Shared lookup tables via `field.config.optionsGridId` and `gridData[gridId]`
 *   where each row is `{ label, value }`.
 * - Fall back to deprecated inline `field.config.options`.
 */
export function resolveFieldOptions(
  field: TrackerField,
  gridData?: GridData
): TrackerOption[] | undefined {
  const optionsGridId = field.config?.optionsGridId
  if (optionsGridId && gridData?.[optionsGridId]) {
    const rows = gridData[optionsGridId] ?? []
    const resolved = rows
      .map((row) => {
        const id = toStringOrEmpty(row.value)
        const label = toStringOrEmpty(row.label)
        return id && label ? ({ id, label } satisfies TrackerOption) : null
      })
      .filter(Boolean) as TrackerOption[]

    return resolved.length > 0 ? resolved : undefined
  }

  return field.config?.options
}

