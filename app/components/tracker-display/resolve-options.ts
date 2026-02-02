import type {
  TrackerField,
  TrackerOption,
  TrackerOptionMap,
  TrackerOptionTable,
} from './types'

function toStringOrEmpty(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function normalizeOption(opt: { label?: string; value?: unknown; id?: string }): TrackerOption {
  return {
    ...opt,
    id: opt.id ?? toStringOrEmpty(opt.value),
    label: opt.label ?? toStringOrEmpty(opt.value),
    value: opt.value,
  }
}

export function resolveFieldOptions(
  field: TrackerField | undefined | null,
  optionTables?: TrackerOptionTable[],
  optionMaps?: TrackerOptionMap[],
  gridData?: Record<string, Array<Record<string, unknown>>>
): TrackerOption[] | undefined {
  if (field == null) return undefined
  const config = field.config ?? {}

  // 1. optionMapId: resolve from Shared tab table rows (gridData)
  const optionMapId = config.optionMapId as string | undefined
  if (optionMapId && optionMaps?.length && gridData) {
    const mapEntry = optionMaps.find((m) => m.id === optionMapId)
    if (mapEntry) {
      const rows = gridData[mapEntry.gridId] ?? []
      const labelKey = mapEntry.labelFieldId ?? 'label'
      const valueKey = mapEntry.valueFieldId ?? 'value'
      if (rows.length) {
        return rows.map((row, i) =>
          normalizeOption({
            id: row.id != null ? String(row.id) : `opt-${i}`,
            label: row[labelKey] != null ? String(row[labelKey]) : '',
            value: row[valueKey],
          })
        )
      }
    }
  }

  // 2. optionTableId (or legacy optionsMappingId) → optionTables
  const optionTableId = (config.optionTableId ?? config.optionsMappingId) as string | undefined
  if (optionTableId && optionTables?.length) {
    const table = optionTables.find((t) => t.id === optionTableId)
    if (table?.options?.length) {
      return table.options.map(normalizeOption)
    }
  }

  // 3. Inline config.options
  const opts = config.options
  if (Array.isArray(opts)) return (opts as TrackerOption[]).map(normalizeOption)
  return undefined
}
