/**
 * Converts between bindings object and Bindings grid row shape.
 * Row columns: binding_select_field, binding_options_grid, binding_label_field (dynamic_select),
 * binding_fields_mapping (field_mappings: array of { from, to } — no order dependency).
 */

import type { TrackerBindings, TrackerBindingEntry, FieldMapping } from '@/lib/types/tracker-bindings'

const SELECT = 'binding_select_field'
const OPTIONS_GRID = 'binding_options_grid'
const LABEL_FIELD = 'binding_label_field'
const MAPPING = 'binding_fields_mapping'

function normalizeFieldMappings(raw: unknown): FieldMapping[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (m): m is FieldMapping =>
      m != null && typeof m === 'object' && typeof (m as FieldMapping).from === 'string' && typeof (m as FieldMapping).to === 'string'
  )
}

export type BindingsGridRow = Record<string, unknown> & {
  [K in typeof SELECT]: string
} & { [K in typeof OPTIONS_GRID]: string } & { [K in typeof LABEL_FIELD]: string } & {
  [K in typeof MAPPING]: FieldMapping[]
}

export function bindingsToGridRows(bindings: TrackerBindings): Array<Record<string, unknown>> {
  return Object.entries(bindings ?? {}).map(([key, entry]) => {
    const e = entry as TrackerBindingEntry
    const mappings = Array.isArray(e.fieldMappings) ? e.fieldMappings : []
    return {
      [SELECT]: key,
      [OPTIONS_GRID]: e.optionsGrid ?? '',
      [LABEL_FIELD]: e.labelField ?? '',
      [MAPPING]: mappings.map((m) => ({ from: m.from, to: m.to })),
    }
  })
}

export function bindingsGridRowsToBindings(
  rows: Array<Record<string, unknown>> | undefined
): TrackerBindings {
  if (!Array.isArray(rows) || rows.length === 0) return {}

  const result: TrackerBindings = {}
  for (const row of rows) {
    const key = row[SELECT]
    if (key == null || String(key).trim() === '') continue

    const k = String(key).trim()
    let fieldMappings = normalizeFieldMappings(row[MAPPING])
    const labelField = String(row[LABEL_FIELD] ?? '').trim()
    if (!labelField) continue
    const optionsGrid = String(row[OPTIONS_GRID] ?? '').trim()
    if (!optionsGrid) continue

    const hasValueMapping = fieldMappings.some((m) => m.to === k && m.from === labelField)
    if (!hasValueMapping) {
      fieldMappings = [{ from: labelField, to: k }, ...fieldMappings]
    }

    result[k] = {
      optionsGrid,
      labelField,
      fieldMappings,
    }
  }
  return result
}
