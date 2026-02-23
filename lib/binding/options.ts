/**
 * Resolve options for select/multiselect fields: from bindings + gridData,
 * dynamic option functions, or inline config.options.
 */

import type { TrackerBindings, TrackerBindingEntry } from '@/lib/types/tracker-bindings'
import type { TrackerContextForOptions, ResolvedOption } from './types'
import {
  getBindingForField,
  resolveOptionsFromBinding,
  buildFieldPath,
} from '@/lib/resolve-bindings'
import { getDynamicOptions } from '@/lib/dynamic-options'

/** Minimal field shape for option resolution. */
interface FieldWithOptions {
  id: string
  dataType?: string
  config?: unknown
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
  _gridData?: Record<string, Array<Record<string, unknown>>>
): ResolvedOption[] | undefined {
  if (field == null) return undefined
  const config = (field.config ?? {}) as { options?: Array<{ label?: string; value?: unknown; id?: string }> }
  const opts = config.options
  if (Array.isArray(opts)) return opts.map(normalizeOption)
  return undefined
}

/**
 * Resolve options for a field: bindings + gridData, or dynamic option function, or inline config.options.
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
  if (
    dataType === 'dynamic_select' ||
    dataType === 'dynamic_multiselect' ||
    dataType === 'field_mappings'
  ) {
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
