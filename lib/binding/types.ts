/**
 * Shared types for the binding module: schema building, enrichment, and option resolution.
 */

import type { DynamicOptionsContext } from '@/lib/dynamic-options/types'

/** Tracker schema shape used when building/enriching bindings. */
export interface TrackerLike {
  tabs?: Array<{ id: string; name?: string; placeId?: number; config?: Record<string, unknown> }>
  sections?: Array<{ id: string; name?: string; tabId: string; placeId?: number; config?: Record<string, unknown> }>
  grids?: Array<{ id: string; name?: string; type?: string; sectionId: string; placeId?: number; config?: Record<string, unknown> }>
  fields?: Array<{
    id: string
    dataType: string
    ui?: { label?: string; placeholder?: string }
    config?: Record<string, unknown> | null
  }>
  layoutNodes?: Array<{ gridId: string; fieldId: string; order?: number }>
  bindings?: Record<string, { optionsGrid: string; labelField: string; fieldMappings: Array<{ from: string; to: string }> }>
  dependsOn?: Array<Record<string, unknown>>
}

/** Context passed when resolving options. Same shape as DynamicOptionsContext for compatibility. */
export type TrackerContextForOptions = DynamicOptionsContext

/** Normalized option for Select/MultiSelect (label, value, id). */
export interface ResolvedOption {
  label: string
  value: unknown
  id?: string
  [key: string]: unknown
}
