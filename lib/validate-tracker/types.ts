/**
 * Shared types for tracker validation.
 */

import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'
import type { DynamicOptionsDefinitions } from '@/lib/dynamic-options'

/** Binding entry structure for validation (no valueField - value is in fieldMappings) */
export interface BindingEntry {
  optionsGrid: string
  labelField: string
  fieldMappings: Array<{ from: string; to: string }>
}

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
  layoutNodes?: Array<{ gridId: string; fieldId: string; order?: number; row?: number; col?: number }>
  bindings?: Record<string, BindingEntry>
  validations?: Record<string, FieldValidationRule[]>
  calculations?: Record<string, FieldCalculationRule>
  dependsOn?: Array<{ source?: string; targets?: string[]; action?: string; operator?: string; value?: unknown }>
  dynamicOptions?: DynamicOptionsDefinitions
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/** Context built once and passed to validators to avoid recomputing id sets. Arrays are always defined (from tracker or []). */
export interface ValidationContext {
  tabIds: Set<string>
  sectionIds: Set<string>
  gridIds: Set<string>
  fieldIds: Set<string>
  /** Set of "gridId.fieldId" for each (gridId, fieldId) in layoutNodes (like bindings). */
  fieldPaths: Set<string>
  tabs: NonNullable<TrackerLike['tabs']>
  sections: NonNullable<TrackerLike['sections']>
  grids: NonNullable<TrackerLike['grids']>
  fields: NonNullable<TrackerLike['fields']>
  layoutNodes: NonNullable<TrackerLike['layoutNodes']>
  bindings: NonNullable<TrackerLike['bindings']>
  validations: NonNullable<TrackerLike['validations']>
  calculations: NonNullable<TrackerLike['calculations']>
  dynamicOptions: NonNullable<TrackerLike['dynamicOptions']>
}

export type ValidatorResult = { errors?: string[]; warnings?: string[] }
