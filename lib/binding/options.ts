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
import {
  resolveDynamicOptions,
  resolveDynamicOptionsSync,
  type DynamicOptionsRuntimeContext,
  type DynamicOptionsResolveResult,
} from '@/lib/dynamic-options'

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
  void _gridData
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
  trackerContext?: TrackerContextForOptions,
  runtime?: DynamicOptionsRuntimeContext,
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
      const result = resolveDynamicOptionsSync(functionId, {
        ...trackerContext,
        gridData,
        runtime: {
          ...(trackerContext.runtime ?? {}),
          ...(runtime ?? {}),
        },
      })
      return result.options.map((opt) => normalizeOption(opt))
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

interface ResolveFieldOptionsAsyncOptions {
  forceRefresh?: boolean
}

async function resolveDynamicOptionsRemote(payload: {
  functionId: string
  args?: Record<string, unknown>
  context: TrackerContextForOptions
  runtime?: DynamicOptionsRuntimeContext
  forceRefresh?: boolean
  cacheTtlSecondsOverride?: number
}): Promise<DynamicOptionsResolveResult> {
  const response = await fetch('/api/dynamic-options/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to resolve dynamic options')
  }
  const options: DynamicOptionsResolveResult['options'] = []
  if (Array.isArray(data?.options)) {
    for (const opt of data.options as unknown[]) {
      if (!opt || typeof opt !== 'object') continue
      const rec = opt as Record<string, unknown>
      if (rec.label == null) continue
      options.push({
        ...rec,
        label: String(rec.label),
        value: rec.value,
        id: rec.id != null ? String(rec.id) : undefined,
      })
    }
  }
  return {
    options,
    warnings: Array.isArray(data?.warnings)
      ? data.warnings.map((w: unknown) => String(w))
      : undefined,
    meta: {
      fromCache: Boolean(data?.meta?.fromCache),
      fetchedAt:
        typeof data?.meta?.fetchedAt === 'string'
          ? data.meta.fetchedAt
          : new Date().toISOString(),
      expiresAt:
        typeof data?.meta?.expiresAt === 'string'
          ? data.meta.expiresAt
          : undefined,
      durationMs:
        typeof data?.meta?.durationMs === 'number'
          ? data.meta.durationMs
          : 0,
      source:
        data?.meta?.source === 'builtin' ||
          data?.meta?.source === 'local_custom' ||
          data?.meta?.source === 'remote_custom' ||
          data?.meta?.source === 'unknown'
          ? data.meta.source
          : 'unknown',
    },
  }
}

/**
 * Async variant that supports remote dynamic option functions (e.g. http_get sources).
 * Falls back to sync logic for non-dynamic fields.
 */
export async function resolveFieldOptionsV2Async(
  tabId: string,
  gridId: string,
  field: FieldWithOptions | undefined | null,
  bindings: TrackerBindings | undefined,
  gridData: Record<string, Array<Record<string, unknown>>>,
  trackerContext?: TrackerContextForOptions,
  runtime?: DynamicOptionsRuntimeContext,
  options?: ResolveFieldOptionsAsyncOptions,
): Promise<ResolvedOption[] | undefined> {
  if (field == null) return undefined
  const dataType = field.dataType
  const isDynamic =
    dataType === 'dynamic_select' ||
    dataType === 'dynamic_multiselect' ||
    dataType === 'field_mappings'

  if (!isDynamic) {
    return resolveFieldOptionsV2(tabId, gridId, field, bindings, gridData, trackerContext)
  }

  const config = (field.config ?? {}) as {
    dynamicOptionsFunction?: string
    dynamicOptionsArgs?: Record<string, unknown>
    dynamicOptionsCacheTtlSeconds?: number
  }
  const functionId = config.dynamicOptionsFunction
  if (!functionId || !trackerContext) return []

  const result = await resolveDynamicOptions({
    functionId,
    context: {
      ...trackerContext,
      gridData,
      runtime: {
        ...(trackerContext.runtime ?? {}),
        ...(runtime ?? {}),
      },
    },
    runtime,
    args: config.dynamicOptionsArgs,
    forceRefresh: options?.forceRefresh,
    cacheTtlSecondsOverride: config.dynamicOptionsCacheTtlSeconds,
    remoteResolver: resolveDynamicOptionsRemote,
  })

  return result.options.map((opt) => normalizeOption(opt))
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
