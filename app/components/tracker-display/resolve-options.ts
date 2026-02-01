import type { TrackerField, TrackerOption, TrackerOptionTable } from './types'

function toStringOrEmpty(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

export function resolveFieldOptions(
  field: TrackerField,
  optionTables?: TrackerOptionTable[]
): TrackerOption[] | undefined {
  const optionsMappingId = field.config?.optionsMappingId as string | undefined
  if (optionsMappingId && optionTables?.length) {
    const table = optionTables.find((t) => t.id === optionsMappingId)
    if (table?.options?.length) {
      return table.options.map((opt) => ({
        ...opt,
        id: opt.id ?? toStringOrEmpty(opt.value),
        label: opt.label ?? toStringOrEmpty(opt.value),
        value: opt.value,
      }))
    }
  }
  const opts = field.config?.options
  if (Array.isArray(opts)) return opts as TrackerOption[]
  return undefined
}
