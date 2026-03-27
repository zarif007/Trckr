/**
 * Definition of the Rules grid columns: field ids, labels, data types, and
 * which dynamic-options function (if any) supplies options for each column.
 * Single source of truth for building the Rules table in the Shared tab.
 */

import {
  DYNAMIC_OPTIONS_ALL_FIELD_PATHS,
  DYNAMIC_OPTIONS_ALL_OPERATORS,
  DYNAMIC_OPTIONS_ALL_ACTIONS,
  DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES,
} from '@/lib/dynamic-options'
import type { TrackerField } from '@/app/components/tracker-display/types'

export const RULES_GRID_FIELD_IDS = [
  'rule_source',
  'rule_operator',
  'rule_value',
  'rule_action',
  'rule_set',
  'rule_targets',
] as const

export type RulesGridFieldId = (typeof RULES_GRID_FIELD_IDS)[number]

export const RULES_GRID_FIELD_LABELS: Record<RulesGridFieldId, string> = {
  rule_source: 'Source',
  rule_operator: 'Operator',
  rule_value: 'Value',
  rule_action: 'Action',
  rule_set: 'Set',
  rule_targets: 'Targets',
}

/** Dynamic option function id per column (from lib/dynamic-options). rule_value has none (free text). */
export const RULES_GRID_DYNAMIC_FUNCTION: Partial<Record<RulesGridFieldId, string>> = {
  rule_source: DYNAMIC_OPTIONS_ALL_FIELD_PATHS,
  rule_operator: DYNAMIC_OPTIONS_ALL_OPERATORS,
  rule_action: DYNAMIC_OPTIONS_ALL_ACTIONS,
  rule_set: DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES,
  rule_targets: DYNAMIC_OPTIONS_ALL_FIELD_PATHS,
}

/** Whether the column is multi-select (e.g. Targets). */
export function isRulesGridFieldMulti(fieldId: RulesGridFieldId): boolean {
  return fieldId === 'rule_targets'
}

/** Data type for the Rules grid field. */
export function getRulesGridFieldDataType(fieldId: RulesGridFieldId): TrackerField['dataType'] {
  if (fieldId === 'rule_value') return 'string'
  return isRulesGridFieldMulti(fieldId) ? 'dynamic_multiselect' : 'dynamic_select'
}

/** Whether the column is required when saving a rule row. */
export function isRulesGridFieldRequired(fieldId: RulesGridFieldId): boolean {
  return fieldId !== 'rule_set' && fieldId !== 'rule_value'
}

/** Build a TrackerField for a Rules grid column. */
export function buildRulesGridField(fieldId: RulesGridFieldId): TrackerField {
  const dynamicFunction = RULES_GRID_DYNAMIC_FUNCTION[fieldId]
  return {
    id: fieldId,
    dataType: getRulesGridFieldDataType(fieldId),
    ui: { label: RULES_GRID_FIELD_LABELS[fieldId], placeholder: '' },
    config: {
      isRequired: isRulesGridFieldRequired(fieldId),
      ...(dynamicFunction ? { dynamicOptionsFunction: dynamicFunction } : {}),
    },
  }
}
