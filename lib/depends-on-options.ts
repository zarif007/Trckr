/**
 * Depends On rules grid for the Shared tab.
 * Creates section "Depends On options" with a Rules table that uses dynamic_select/dynamic_multiselect
 * (options from built-in functions: all_field_paths, all_operators, all_actions, all_rule_set_values).
 */

import type { TrackerGrid, TrackerField, TrackerSection, TrackerLayoutNode } from '@/app/components/tracker-display/types'
import type { TrackerBindings } from '@/lib/types/tracker-bindings'
import type { DependsOnRule, DependsOnRules } from './depends-on'

/** Function ids for Rules grid dynamic fields (must match lib/dynamic-options-functions.ts). */
const ALL_FIELD_PATHS = 'all_field_paths'
const ALL_OPERATORS = 'all_operators'
const ALL_ACTIONS = 'all_actions'
const ALL_RULE_SET_VALUES = 'all_rule_set_values'

export const SHARED_TAB_ID = 'shared_tab'
export const DEPENDS_ON_OPTIONS_SECTION_ID = 'depends_on_options_section'
export const DEPENDS_ON_RULES_GRID = 'depends_on_rules_grid'

/** Operator ids for depends-on rules and dynamic option functions (e.g. all_operators). */
export const OPERATORS = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'in', 'not_in', 'contains', 'not_contains',
  'is_empty', 'not_empty', 'starts_with', 'ends_with',
]
/** Action ids for depends-on rules and dynamic option functions (e.g. all_actions). */
export const ACTIONS = ['isHidden', 'isRequired', 'isDisabled', 'set'] as const

export interface DependsOnOptionGridsInput {
  grids: TrackerGrid[]
  fields: TrackerField[]
  sections: TrackerSection[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  dependsOn: DependsOnRules
}

export interface DependsOnOptionGridsResult {
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  /** Seed gridData for option grids and rules grid. Merge into main gridData. */
  seedGridData: Record<string, Array<Record<string, unknown>>>
}

/** Returns augmented sections, grids, fields, layoutNodes, bindings and seed gridData for Depends On. */
export function ensureDependsOnOptionGrids(input: DependsOnOptionGridsInput): DependsOnOptionGridsResult {
  const { grids, fields, sections, layoutNodes, bindings, dependsOn } = input
  const sectionIds = new Set(sections.map((s) => s.id))
  const gridIds = new Set(grids.map((g) => g.id))
  const fieldIds = new Set(fields.map((f) => f.id))

  let outSections = [...sections]
  let outGrids = [...grids]
  let outFields = [...fields]
  let outLayoutNodes = [...layoutNodes]
  const outBindings = { ...bindings }
  const seedGridData: Record<string, Array<Record<string, unknown>>> = {}

  if (!sectionIds.has(DEPENDS_ON_OPTIONS_SECTION_ID)) {
    const maxPlaceId = Math.max(0, ...sections.map((s) => s.placeId ?? 0))
    outSections = [
      ...outSections,
      {
        id: DEPENDS_ON_OPTIONS_SECTION_ID,
        name: 'Depends On options',
        tabId: SHARED_TAB_ID,
        placeId: maxPlaceId + 1,
        config: {},
      },
    ]
    sectionIds.add(DEPENDS_ON_OPTIONS_SECTION_ID)
  }

  if (!gridIds.has(DEPENDS_ON_RULES_GRID)) {
    outGrids = [
      ...outGrids,
      {
        id: DEPENDS_ON_RULES_GRID,
        name: 'Rules',
        sectionId: DEPENDS_ON_OPTIONS_SECTION_ID,
        placeId: outGrids.filter((g) => g.sectionId === DEPENDS_ON_OPTIONS_SECTION_ID).length + 1,
        config: {},
        type: 'table',
      },
    ]
    gridIds.add(DEPENDS_ON_RULES_GRID)
  }

  const rulesGridFieldIds = ['rule_source', 'rule_operator', 'rule_value', 'rule_action', 'rule_set', 'rule_targets'] as const
  const rulesGridFieldLabels: Record<(typeof rulesGridFieldIds)[number], string> = {
    rule_source: 'Source',
    rule_operator: 'Operator',
    rule_value: 'Value',
    rule_action: 'Action',
    rule_set: 'Set',
    rule_targets: 'Targets',
  }
  /** Dynamic option function per field (dynamic_select/dynamic_multiselect only). */
  const rulesGridDynamicFunction: Partial<Record<(typeof rulesGridFieldIds)[number], string>> = {
    rule_source: ALL_FIELD_PATHS,
    rule_operator: ALL_OPERATORS,
    rule_action: ALL_ACTIONS,
    rule_set: ALL_RULE_SET_VALUES,
    rule_targets: ALL_FIELD_PATHS,
  }
  for (let i = 0; i < rulesGridFieldIds.length; i++) {
    const fid = rulesGridFieldIds[i]
    if (!fieldIds.has(fid)) {
      const isMulti = fid === 'rule_targets'
      const dynamicFunction = rulesGridDynamicFunction[fid]
      const dataType: TrackerField['dataType'] =
        fid === 'rule_value'
          ? 'string'
          : isMulti
            ? 'dynamic_multiselect'
            : 'dynamic_select'
      outFields = [
        ...outFields,
        {
          id: fid,
          dataType,
          ui: { label: rulesGridFieldLabels[fid], placeholder: '' },
          config: {
            isRequired: fid !== 'rule_set' && fid !== 'rule_value',
            ...(dynamicFunction ? { dynamicOptionsFunction: dynamicFunction } : {}),
          },
        },
      ]
      fieldIds.add(fid)
    }
    if (!outLayoutNodes.some((n) => n.gridId === DEPENDS_ON_RULES_GRID && n.fieldId === fid)) {
      outLayoutNodes = [
        ...outLayoutNodes,
        { gridId: DEPENDS_ON_RULES_GRID, fieldId: fid, order: i + 1 },
      ]
    }
  }

  const rulesAsRows = dependsOn.map((r) => ({
    rule_source: r.source ?? '',
    rule_operator: r.operator ?? 'eq',
    rule_value: r.value,
    rule_action: r.action ?? 'isHidden',
    rule_set: r.set !== undefined ? (typeof r.set === 'boolean' ? (r.set ? 'true' : 'false') : r.set) : 'true',
    rule_targets: Array.isArray(r.targets) ? r.targets : [],
  }))
  seedGridData[DEPENDS_ON_RULES_GRID] = rulesAsRows

  return {
    sections: outSections,
    grids: outGrids,
    fields: outFields,
    layoutNodes: outLayoutNodes,
    bindings: outBindings,
    seedGridData,
  }
}

/**
 * Convert rules grid rows (from gridData[DEPENDS_ON_RULES_GRID]) to DependsOnRule[].
 * Used so that when the user adds/edits rows in the Rules table, those rules become the effective dependsOn.
 * Rows missing source or targets are skipped.
 */
export function rulesGridRowsToDependsOn(
  rows: Array<Record<string, unknown>> | undefined
): DependsOnRule[] {
  if (!Array.isArray(rows) || rows.length === 0) return []
  const result: DependsOnRule[] = []
  for (const row of rows) {
    const source = row.rule_source
    const targets = row.rule_targets
    if (source == null || source === '' || !Array.isArray(targets) || targets.length === 0) continue
    const setRaw = row.rule_set
    const setValue =
      setRaw === 'true' || setRaw === true
        ? true
        : setRaw === 'false' || setRaw === false
          ? false
          : setRaw
    result.push({
      source: String(source),
      operator: (row.rule_operator as DependsOnRule['operator']) ?? 'eq',
      value: row.rule_value,
      action: (row.rule_action as DependsOnRule['action']) ?? 'isHidden',
      set: setValue,
      targets: targets.map(String),
    })
  }
  return result
}
