import type { TrackerBindings, TrackerBindingEntry } from '@/lib/types/tracker-bindings'
import type { TrackerGrid, TrackerField } from '@/app/components/tracker-display/types'
import {
  getBindingForField,
  resolveOptionsFromBinding,
  buildFieldPath,
} from '@/lib/resolve-bindings'
import { getDynamicOptions } from '@/lib/dynamic-options-functions'

/** Minimal field shape needed for option resolution (avoids importing from app). Accepts any field with id and optional config. */
interface FieldWithOptions {
  id: string
  dataType?: string
  config?: unknown
}

export interface TrackerContextForOptions {
  grids: TrackerGrid[]
  fields: TrackerField[]
}

/** Normalized option row (compatible with TrackerOption) */
export interface ResolvedOption {
  label: string
  value: unknown
  id?: string
  [key: string]: unknown
}

function toStringOrEmpty(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function normalizeOption(opt: { label?: string; value?: unknown; id?: string }): ResolvedOption {
  const valueString = toStringOrEmpty(opt.value)
  return {
    ...opt,
    id: valueString !== '' ? valueString : (opt.id ?? ''),
    label: opt.label ?? toStringOrEmpty(opt.value),
    value: opt.value,
  }
}

/**
 * Resolve options from inline config.options only (no bindings).
 */
export function resolveFieldOptionsLegacy(
  field: FieldWithOptions | undefined | null,
  gridData?: Record<string, Array<Record<string, unknown>>>
): ResolvedOption[] | undefined {
  if (field == null) return undefined
  const config = (field.config ?? {}) as { options?: Array<{ label?: string; value?: unknown; id?: string }> }
  const opts = config.options
  if (Array.isArray(opts)) return opts.map(normalizeOption)
  return undefined
}

/**
 * Resolve options for a field from bindings (and gridData), or from a dynamic option function for dynamic_select/dynamic_multiselect. Fallback to inline config.options only.
 */
export function resolveFieldOptionsV2(
  tabId: string,
  gridId: string,
  field: FieldWithOptions | undefined | null,
  bindings: TrackerBindings | undefined,
  gridData: Record<string, Array<Record<string, unknown>>>,
  trackerContext?: TrackerContextForOptions
): ResolvedOption[] | undefined {
  if (field == null) return undefined

  const dataType = field.dataType
  if (dataType === 'dynamic_select' || dataType === 'dynamic_multiselect') {
    const config = (field.config ?? {}) as { dynamicOptionsFunction?: string }
    const functionId = config.dynamicOptionsFunction
    if (functionId && trackerContext) {
      const options = getDynamicOptions(functionId, trackerContext)
      return options.map((opt) => normalizeOption(opt))
    }
    return []
  }

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
