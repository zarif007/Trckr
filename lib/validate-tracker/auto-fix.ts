/**
 * Auto-fix missing bindings for select/multiselect fields.
 * Creates default bindings with Shared tab infrastructure; returns a new tracker (does not mutate).
 */

import type { TrackerLike } from './types'
import { titleCase } from './utils'

const SHARED_TAB_ID = 'shared_tab'
const SHARED_SECTION_ID = 'option_lists_section'

export function autoFixBindings<T extends TrackerLike>(tracker: T): T {
  if (!tracker) return tracker

  const fixed: TrackerLike = {
    tabs: [...(tracker.tabs ?? [])],
    sections: [...(tracker.sections ?? [])],
    grids: [...(tracker.grids ?? [])],
    fields: [...(tracker.fields ?? [])],
    layoutNodes: [...(tracker.layoutNodes ?? [])],
    bindings: { ...(tracker.bindings ?? {}) },
  }

  const tabIds = new Set(fixed.tabs!.map((t) => t.id))
  const sectionIds = new Set(fixed.sections!.map((s) => s.id))
  const gridIds = new Set(fixed.grids!.map((g) => g.id))
  const fieldIds = new Set(fixed.fields!.map((f) => f.id))
  const sections = fixed.sections!
  const grids = fixed.grids!
  const layoutNodes = fixed.layoutNodes!

  const getGridInfo = (fieldId: string): { tabId: string; gridId: string } | null => {
    const layoutNode = layoutNodes.find((n) => n.fieldId === fieldId)
    if (!layoutNode) return null
    const grid = grids.find((g) => g.id === layoutNode.gridId)
    if (!grid) return null
    const section = sections.find((s) => s.id === grid.sectionId)
    if (!section) return null
    return { tabId: section.tabId, gridId: grid.id }
  }

  const ensureSharedTabInfrastructure = () => {
    if (!tabIds.has(SHARED_TAB_ID)) {
      const maxPlaceId = Math.max(0, ...fixed.tabs!.map((t) => t.placeId ?? 0))
      fixed.tabs!.push({
        id: SHARED_TAB_ID,
        name: 'Shared',
        placeId: maxPlaceId + 100,
        config: {},
      })
      tabIds.add(SHARED_TAB_ID)
    }
    if (!sectionIds.has(SHARED_SECTION_ID)) {
      fixed.sections!.push({
        id: SHARED_SECTION_ID,
        name: 'Option Lists',
        tabId: SHARED_TAB_ID,
        placeId: 1,
        config: {},
      })
      sectionIds.add(SHARED_SECTION_ID)
    }
  }

  let gridPlaceId = Math.max(
    0,
    ...fixed.grids!.filter((g) => g.sectionId === SHARED_SECTION_ID).map((g) => g.placeId ?? 0)
  )

  for (const field of fixed.fields!) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue

    const gridInfo = getGridInfo(field.id)
    if (!gridInfo) continue

    const fieldPath = `${gridInfo.gridId}.${field.id}`
    if (fixed.bindings![fieldPath]) continue

    ensureSharedTabInfrastructure()

    const baseName = field.id.replace(/_/g, ' ')
    const optionsGridId = `${field.id}_options_grid`
    const optionFieldId = field.id

    if (!gridIds.has(optionsGridId)) {
      gridPlaceId++
      fixed.grids!.push({
        id: optionsGridId,
        name: `${titleCase(baseName)} Options`,
        type: 'table',
        sectionId: SHARED_SECTION_ID,
        placeId: gridPlaceId,
        config: {},
      })
      gridIds.add(optionsGridId)
    }

    if (!fieldIds.has(optionFieldId)) {
      fixed.fields!.push({
        id: optionFieldId,
        dataType: 'string',
        ui: { label: titleCase(baseName), placeholder: 'Option name' },
        config: { isRequired: true },
      })
      fieldIds.add(optionFieldId)
    }

    const existingNodes = fixed.layoutNodes!.filter((n) => n.gridId === optionsGridId)
    if (!existingNodes.some((n) => n.fieldId === optionFieldId)) {
      fixed.layoutNodes!.push({ gridId: optionsGridId, fieldId: optionFieldId, order: 1 })
    }

    const optionFieldPath = `${optionsGridId}.${optionFieldId}`
    fixed.bindings![fieldPath] = {
      optionsGrid: optionsGridId,
      labelField: optionFieldPath,
      fieldMappings: [{ from: optionFieldPath, to: fieldPath }],
    }
  }

  return { ...tracker, ...fixed } as T
}
