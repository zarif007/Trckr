/**
 * Ensures the Field mappings section and Bindings grid exist on the Shared tab,
 * and produces seed gridData from current bindings.
 */

import type {
  TrackerGrid,
  TrackerField,
  TrackerSection,
  TrackerLayoutNode,
} from '@/app/components/tracker-display/types'
import type { TrackerBindings } from '@/lib/types/tracker-bindings'
import { SHARED_TAB_ID } from '@/lib/depends-on-options'
import { BINDINGS_SECTION_ID, BINDINGS_GRID_ID, BINDINGS_GRID_FIELD_IDS } from './constants'
import { buildBindingsGridField } from './spec'
import { bindingsToGridRows } from './rows'

export interface EnsureBindingsGridInput {
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
}

export interface EnsureBindingsGridResult {
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  seedGridData: Record<string, Array<Record<string, unknown>>>
}

/** Returns augmented sections, grids, fields, layoutNodes and seed gridData for the Bindings grid. */
export function ensureBindingsGrid(input: EnsureBindingsGridInput): EnsureBindingsGridResult {
  const { sections, grids, fields, layoutNodes, bindings } = input
  const sectionIds = new Set(sections.map((s) => s.id))
  const gridIds = new Set(grids.map((g) => g.id))
  const fieldIds = new Set(fields.map((f) => f.id))

  let outSections = [...sections]
  let outGrids = [...grids]
  let outFields = [...fields]
  let outLayoutNodes = [...layoutNodes]
  const seedGridData: Record<string, Array<Record<string, unknown>>> = {}

  if (!sectionIds.has(BINDINGS_SECTION_ID)) {
    outSections = [
      ...outSections,
      {
        id: BINDINGS_SECTION_ID,
        name: 'Bindings',
        tabId: SHARED_TAB_ID,
        placeId: 0,
        config: {},
      },
    ]
    sectionIds.add(BINDINGS_SECTION_ID)
  }

  if (!gridIds.has(BINDINGS_GRID_ID)) {
    outGrids = [
      ...outGrids,
      {
        id: BINDINGS_GRID_ID,
        name: 'Bindings',
        sectionId: BINDINGS_SECTION_ID,
        placeId: 0,
        config: {},
        views: [{ id: `${BINDINGS_GRID_ID}_table_view`, name: 'Table', type: 'table', config: {} }],
      },
    ]
    gridIds.add(BINDINGS_GRID_ID)
  }

  for (let i = 0; i < BINDINGS_GRID_FIELD_IDS.length; i++) {
    const fieldId = BINDINGS_GRID_FIELD_IDS[i]
    if (!fieldIds.has(fieldId)) {
      outFields = [...outFields, buildBindingsGridField(fieldId)]
      fieldIds.add(fieldId)
    }
    if (!outLayoutNodes.some((n) => n.gridId === BINDINGS_GRID_ID && n.fieldId === fieldId)) {
      outLayoutNodes = [
        ...outLayoutNodes,
        { gridId: BINDINGS_GRID_ID, fieldId, order: i + 1 },
      ]
    }
  }

  seedGridData[BINDINGS_GRID_ID] = bindingsToGridRows(bindings) as Array<Record<string, unknown>>

  return {
    sections: outSections,
    grids: outGrids,
    fields: outFields,
    layoutNodes: outLayoutNodes,
    seedGridData,
  }
}
