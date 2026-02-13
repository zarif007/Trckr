/**
 * Ensures the Depends On section, Rules grid, and rule columns exist in the
 * tracker structure and produces seed gridData from current dependsOn rules.
 */

import type {
  TrackerGrid,
  TrackerField,
  TrackerSection,
  TrackerLayoutNode,
} from '@/app/components/tracker-display/types'
import type { DependsOnRules } from '@/lib/depends-on'
import { SHARED_TAB_ID, DEPENDS_ON_OPTIONS_SECTION_ID, DEPENDS_ON_RULES_GRID } from './constants'
import type { DependsOnOptionGridsInput, DependsOnOptionGridsResult } from './types'
import {
  RULES_GRID_FIELD_IDS,
  buildRulesGridField,
} from './rules-grid-spec'

/** Returns augmented sections, grids, fields, layoutNodes, bindings and seed gridData for Depends On. */
export function ensureDependsOnOptionGrids(
  input: DependsOnOptionGridsInput
): DependsOnOptionGridsResult {
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

  for (let i = 0; i < RULES_GRID_FIELD_IDS.length; i++) {
    const fieldId = RULES_GRID_FIELD_IDS[i]
    if (!fieldIds.has(fieldId)) {
      outFields = [...outFields, buildRulesGridField(fieldId)]
      fieldIds.add(fieldId)
    }
    if (!outLayoutNodes.some((n) => n.gridId === DEPENDS_ON_RULES_GRID && n.fieldId === fieldId)) {
      outLayoutNodes = [
        ...outLayoutNodes,
        { gridId: DEPENDS_ON_RULES_GRID, fieldId, order: i + 1 },
      ]
    }
  }

  const rulesAsRows = dependsOnToGridRows(dependsOn)
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

/** Convert DependsOnRules to the row shape expected by the Rules grid. */
function dependsOnToGridRows(dependsOn: DependsOnRules): Array<Record<string, unknown>> {
  return dependsOn.map((r) => ({
    rule_source: r.source ?? '',
    rule_operator: r.operator ?? 'eq',
    rule_value: r.value,
    rule_action: r.action ?? 'isHidden',
    rule_set:
      r.set !== undefined
        ? typeof r.set === 'boolean'
          ? r.set
            ? 'true'
            : 'false'
          : r.set
        : 'true',
    rule_targets: Array.isArray(r.targets) ? r.targets : [],
  }))
}
