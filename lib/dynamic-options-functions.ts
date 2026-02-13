/**
 * Built-in dynamic option functions for dynamic_select and dynamic_multiselect fields.
 * Options are resolved by function id (e.g. all_field_paths, all_operators) instead of bindings.
 */

import type { TrackerGrid, TrackerField } from '@/app/components/tracker-display/types'
import type { ResolvedOption } from './resolve-options'
import { OPERATORS, ACTIONS } from './depends-on-options'

/** Known built-in function ids for dynamic options. */
export const DYNAMIC_OPTIONS_ALL_FIELD_PATHS = 'all_field_paths'
export const DYNAMIC_OPTIONS_ALL_OPERATORS = 'all_operators'
export const DYNAMIC_OPTIONS_ALL_ACTIONS = 'all_actions'
export const DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES = 'all_rule_set_values'

export const KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS = [
  DYNAMIC_OPTIONS_ALL_FIELD_PATHS,
  DYNAMIC_OPTIONS_ALL_OPERATORS,
  DYNAMIC_OPTIONS_ALL_ACTIONS,
  DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES,
] as const

export interface DynamicOptionsContext {
  grids: TrackerGrid[]
  fields: TrackerField[]
}

/**
 * From trackerData.fields (all fields) matched with all grids: build a list of options
 * with value/label like gridId.fieldId and "Grid name → Field label".
 */
function allFieldPaths(context: DynamicOptionsContext): ResolvedOption[] {
  const { grids, fields } = context
  return grids.flatMap((g) =>
    fields
      .filter((f) => !(f.config as { isHidden?: boolean } | undefined)?.isHidden)
      .map((f) => ({
        value: `${g.id}.${f.id}`,
        label: `${g.name ?? g.id} → ${f.ui?.label ?? f.id}`,
        id: `${g.id}.${f.id}`,
      }))
  )
}

function allOperators(): ResolvedOption[] {
  return OPERATORS.map((op) => ({
    value: op,
    label: op,
    id: op,
  }))
}

function allActions(): ResolvedOption[] {
  return ACTIONS.map((a) => ({
    value: a,
    label: a,
    id: a,
  }))
}

function allRuleSetValues(): ResolvedOption[] {
  return [
    { value: 'true', label: 'True', id: 'true' },
    { value: 'false', label: 'False', id: 'false' },
  ]
}

/**
 * Resolve options for a dynamic select/multiselect field by function id.
 * Returns [] for unknown or missing functionId.
 */
export function getDynamicOptions(
  functionId: string,
  context: DynamicOptionsContext
): ResolvedOption[] {
  if (!functionId || typeof functionId !== 'string') return []
  switch (functionId) {
    case DYNAMIC_OPTIONS_ALL_FIELD_PATHS:
      return allFieldPaths(context)
    case DYNAMIC_OPTIONS_ALL_OPERATORS:
      return allOperators()
    case DYNAMIC_OPTIONS_ALL_ACTIONS:
      return allActions()
    case DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES:
      return allRuleSetValues()
    default:
      return []
  }
}
