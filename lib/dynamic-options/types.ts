/**
 * Shared types and constants for dynamic options (dynamic_select / dynamic_multiselect).
 */

import type { TrackerGrid, TrackerField } from '@/app/components/tracker-display/types'

/** Option shape returned by dynamic option functions (compatible with ResolvedOption in resolve-options). */
export interface DynamicOption {
  label: string
  value: unknown
  id?: string
  [key: string]: unknown
}

/** Layout node linking a field to a grid (subset of TrackerLayoutNode). */
export interface DynamicOptionsLayoutNode {
  gridId: string
  fieldId: string
}

/** Minimal section shape for resolving grid -> tab (id, tabId). */
export interface DynamicOptionsSection {
  id: string
  tabId: string
}

/** Context passed to dynamic option functions. */
export interface DynamicOptionsContext {
  grids: TrackerGrid[]
  fields: TrackerField[]
  /** When provided, all_field_paths only returns paths that exist in layout (grid.field on a grid). */
  layoutNodes?: DynamicOptionsLayoutNode[]
  /** When provided, all_field_paths excludes fields on sections with tabId === shared_tab. */
  sections?: DynamicOptionsSection[]
}

/** Signature of a dynamic options function. */
export type DynamicOptionsFn = (
  context: DynamicOptionsContext
) => DynamicOption[]

/** Built-in function ids. Add new ids here when adding new functions. */
export const DYNAMIC_OPTIONS_ALL_FIELD_PATHS = 'all_field_paths'
export const DYNAMIC_OPTIONS_ALL_FIELD_PATHS_INCLUDING_SHARED = 'all_field_paths_including_shared'
export const DYNAMIC_OPTIONS_ALL_GRIDS = 'all_grids'
export const DYNAMIC_OPTIONS_ALL_OPERATORS = 'all_operators'
export const DYNAMIC_OPTIONS_ALL_ACTIONS = 'all_actions'
export const DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES = 'all_rule_set_values'

export const KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS = [
  DYNAMIC_OPTIONS_ALL_FIELD_PATHS,
  DYNAMIC_OPTIONS_ALL_FIELD_PATHS_INCLUDING_SHARED,
  DYNAMIC_OPTIONS_ALL_GRIDS,
  DYNAMIC_OPTIONS_ALL_OPERATORS,
  DYNAMIC_OPTIONS_ALL_ACTIONS,
  DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES,
] as const

export type KnownDynamicOptionsFunctionId =
  (typeof KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS)[number]
