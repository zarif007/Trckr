import type {
  TrackerField,
  TrackerOption,
  TrackerBindings,
  TrackerBindingEntry,
} from './types'
import {
  getBindingForField,
  resolveOptionsFromBinding,
  buildFieldPath,
} from '@/lib/resolve-bindings'

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

/**
 * Resolve options from inline config.options only (no bindings).
 */
export function resolveFieldOptionsLegacy(
  field: TrackerField | undefined | null,
  gridData?: Record<string, Array<Record<string, unknown>>>
): TrackerOption[] | undefined {
  if (field == null) return undefined
  const config = field.config ?? {}
  const opts = config.options
  if (Array.isArray(opts)) return (opts as TrackerOption[]).map(normalizeOption)
  return undefined
}

/**
 * Resolve options for a field from bindings (and gridData). Fallback to inline config.options only.
 */
export function resolveFieldOptionsV2(
  tabId: string,
  gridId: string,
  field: TrackerField | undefined | null,
  bindings: TrackerBindings | undefined,
  gridData: Record<string, Array<Record<string, unknown>>>
): TrackerOption[] | undefined {
  if (field == null) return undefined

  const binding = getBindingForField(gridId, field.id, bindings, tabId)
  if (binding) {
    const selectFieldPath = buildFieldPath(gridId, field.id)
    const options = resolveOptionsFromBinding(binding, gridData, selectFieldPath)
    return options.map(normalizeOption)
  }

  return resolveFieldOptionsLegacy(field, gridData)
}

/**
 * Get the binding entry for a field if it exists.
 * Re-exported from resolve-bindings for convenience.
 */
export function getFieldBinding(
  gridId: string,
  fieldId: string,
  bindings?: TrackerBindings,
  tabId?: string
): TrackerBindingEntry | undefined {
  return getBindingForField(gridId, fieldId, bindings, tabId)
}
