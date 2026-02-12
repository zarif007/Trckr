/**
 * Depends On option grids and rules grid for the Shared tab.
 * Creates section "Depends On options" with option grids (operator, action, field path)
 * and a virtual rules grid that uses DataTable with bindings to those options.
 */

import type { TrackerGrid, TrackerField, TrackerSection, TrackerLayoutNode } from '@/app/components/tracker-display/types'
import type { TrackerBindings } from '@/lib/types/tracker-bindings'
import type { DependsOnRules } from './depends-on'

export const SHARED_TAB_ID = 'shared_tab'
export const DEPENDS_ON_OPTIONS_SECTION_ID = 'depends_on_options_section'
export const DEPENDS_ON_OPERATOR_OPTIONS_GRID = 'depends_on_operator_options_grid'
export const DEPENDS_ON_ACTION_OPTIONS_GRID = 'depends_on_action_options_grid'
export const DEPENDS_ON_FIELD_OPTIONS_GRID = 'depends_on_field_options_grid'
export const DEPENDS_ON_RULES_GRID = 'depends_on_rules_grid'

const OPERATORS = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'in', 'not_in', 'contains', 'not_contains',
  'is_empty', 'not_empty', 'starts_with', 'ends_with',
]
const ACTIONS = ['isHidden', 'isRequired', 'isDisabled', 'set'] as const

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

  const addOptionGrid = (
    gridId: string,
    name: string,
    optionFieldId: string,
    optionFieldLabel: string,
    rows: Array<Record<string, unknown>>
  ) => {
    if (!gridIds.has(gridId)) {
      outGrids = [
        ...outGrids,
        {
          id: gridId,
          name,
          sectionId: DEPENDS_ON_OPTIONS_SECTION_ID,
          placeId: outGrids.filter((g) => g.sectionId === DEPENDS_ON_OPTIONS_SECTION_ID).length + 1,
          config: {},
          type: 'table',
        },
      ]
      gridIds.add(gridId)
    }
    if (!fieldIds.has(optionFieldId)) {
      outFields = [
        ...outFields,
        {
          id: optionFieldId,
          dataType: 'string' as const,
          ui: { label: optionFieldLabel, placeholder: '' },
          config: {},
        },
      ]
      fieldIds.add(optionFieldId)
    }
    if (!outLayoutNodes.some((n) => n.gridId === gridId && n.fieldId === optionFieldId)) {
      outLayoutNodes = [
        ...outLayoutNodes,
        { gridId, fieldId: optionFieldId, order: 1 },
      ]
    }
    seedGridData[gridId] = rows
  }

  const OPERATOR_FIELD_ID = 'dot_operator'
  const ACTION_FIELD_ID = 'dot_action'
  const PATH_FIELD_ID = 'dot_path'

  addOptionGrid(
    DEPENDS_ON_OPERATOR_OPTIONS_GRID,
    'Operator options',
    OPERATOR_FIELD_ID,
    'Operator',
    OPERATORS.map((op) => ({ [OPERATOR_FIELD_ID]: op }))
  )
  addOptionGrid(
    DEPENDS_ON_ACTION_OPTIONS_GRID,
    'Action options',
    ACTION_FIELD_ID,
    'Action',
    ACTIONS.map((a) => ({ [ACTION_FIELD_ID]: a }))
  )

  const fieldPathRows = grids.flatMap((g) =>
    fields
      .filter((f) => !f.config?.isHidden)
      .map((f) => ({
        [PATH_FIELD_ID]: `${g.id}.${f.id}`,
        label: `${g.name ?? g.id} → ${f.ui?.label ?? f.id}`,
      }))
  )
  const pathRows = fieldPathRows.length > 0
    ? fieldPathRows.map((r) => ({ [PATH_FIELD_ID]: r[PATH_FIELD_ID] }))
    : [{ [PATH_FIELD_ID]: '' }]
  addOptionGrid(
    DEPENDS_ON_FIELD_OPTIONS_GRID,
    'Field options (source/targets)',
    PATH_FIELD_ID,
    'Field path',
    pathRows
  )

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

  const rulesGridFieldIds = ['rule_source', 'rule_operator', 'rule_value', 'rule_action', 'rule_targets'] as const
  const rulesGridFieldLabels: Record<(typeof rulesGridFieldIds)[number], string> = {
    rule_source: 'Source',
    rule_operator: 'Operator',
    rule_value: 'Value',
    rule_action: 'Action',
    rule_targets: 'Targets',
  }
  for (let i = 0; i < rulesGridFieldIds.length; i++) {
    const fid = rulesGridFieldIds[i]
    if (!fieldIds.has(fid)) {
      const isMulti = fid === 'rule_targets'
      outFields = [
        ...outFields,
        {
          id: fid,
          dataType: (isMulti ? 'multiselect' : fid === 'rule_value' ? 'string' : 'options') as TrackerField['dataType'],
          ui: { label: rulesGridFieldLabels[fid], placeholder: '' },
          config: {},
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

  const rulesGridPath = (fieldId: string) => `${DEPENDS_ON_RULES_GRID}.${fieldId}`
  outBindings[rulesGridPath('rule_source')] = {
    optionsGrid: DEPENDS_ON_FIELD_OPTIONS_GRID,
    labelField: `${DEPENDS_ON_FIELD_OPTIONS_GRID}.${PATH_FIELD_ID}`,
    fieldMappings: [{ from: `${DEPENDS_ON_FIELD_OPTIONS_GRID}.${PATH_FIELD_ID}`, to: rulesGridPath('rule_source') }],
  }
  outBindings[rulesGridPath('rule_operator')] = {
    optionsGrid: DEPENDS_ON_OPERATOR_OPTIONS_GRID,
    labelField: `${DEPENDS_ON_OPERATOR_OPTIONS_GRID}.${OPERATOR_FIELD_ID}`,
    fieldMappings: [{ from: `${DEPENDS_ON_OPERATOR_OPTIONS_GRID}.${OPERATOR_FIELD_ID}`, to: rulesGridPath('rule_operator') }],
  }
  outBindings[rulesGridPath('rule_action')] = {
    optionsGrid: DEPENDS_ON_ACTION_OPTIONS_GRID,
    labelField: `${DEPENDS_ON_ACTION_OPTIONS_GRID}.${ACTION_FIELD_ID}`,
    fieldMappings: [{ from: `${DEPENDS_ON_ACTION_OPTIONS_GRID}.${ACTION_FIELD_ID}`, to: rulesGridPath('rule_action') }],
  }
  outBindings[rulesGridPath('rule_targets')] = {
    optionsGrid: DEPENDS_ON_FIELD_OPTIONS_GRID,
    labelField: `${DEPENDS_ON_FIELD_OPTIONS_GRID}.${PATH_FIELD_ID}`,
    fieldMappings: [{ from: `${DEPENDS_ON_FIELD_OPTIONS_GRID}.${PATH_FIELD_ID}`, to: rulesGridPath('rule_targets') }],
  }

  const rulesAsRows = dependsOn.map((r) => ({
    rule_source: r.source ?? '',
    rule_operator: r.operator ?? 'eq',
    rule_value: r.value,
    rule_action: r.action ?? 'isHidden',
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
