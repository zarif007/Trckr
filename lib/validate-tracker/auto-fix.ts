/**
 * Auto-fix missing bindings and invalid bindings (select field id === options grid field id).
 * Creates default bindings with Master Data tab infrastructure and repairs same-id bindings; returns a new tracker (does not mutate).
 */

import { parsePath, normalizeOptionsGridId } from '@/lib/resolve-bindings'
import type { TrackerLike } from './types'
import { titleCase } from './utils'
import { MASTER_DATA_SECTION_ID, MASTER_DATA_TAB_ID } from '@/lib/master-data/constants'
import { resolveMasterDataScopeFromTracker } from '@/lib/master-data-scope'

const LEGACY_SHARED_TAB_ID = 'shared_tab'
const LEGACY_SHARED_SECTION_ID = 'option_lists_section'

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

  const masterDataScope = resolveMasterDataScopeFromTracker(tracker as { masterDataScope?: unknown })
  const hasLegacySharedTab = (fixed.tabs ?? []).some((t) => t.id === LEGACY_SHARED_TAB_ID)
  const useLocalOptions = masterDataScope === 'tracker'
  const container = hasLegacySharedTab
    ? {
      tabId: LEGACY_SHARED_TAB_ID,
      tabName: 'Shared',
      sectionId: LEGACY_SHARED_SECTION_ID,
      sectionName: 'Option Lists',
    }
    : {
      tabId: MASTER_DATA_TAB_ID,
      tabName: 'Master Data',
      sectionId: MASTER_DATA_SECTION_ID,
      sectionName: 'Master Data',
    }

  const tabIds = new Set(fixed.tabs!.map((t) => t.id))
  const sectionIds = new Set(fixed.sections!.map((s) => s.id))
  const gridIds = new Set(fixed.grids!.map((g) => g.id))
  const fieldIds = new Set(fixed.fields!.map((f) => f.id))
  const sections = fixed.sections!
  const grids = fixed.grids!
  const layoutNodes = fixed.layoutNodes!

  // --- Fix invalid bindings: select field id must not equal options grid label field id ---
  for (const [fieldPath, entry] of Object.entries(fixed.bindings!)) {
    if (entry.optionsSourceSchemaId?.trim()) continue
    const { fieldId: selectFieldId } = parsePath(fieldPath)
    const optGridId = normalizeOptionsGridId(entry.optionsGrid)
    const labelParsed = parsePath(entry.labelField)
    const labelFieldId = labelParsed?.fieldId
    if (!selectFieldId || !labelFieldId || selectFieldId !== labelFieldId || !optGridId) continue

    const selectField = fixed.fields!.find((f) => f.id === selectFieldId)
    const baseName = (selectField?.id ?? selectFieldId).replace(/_/g, ' ')
    let optionFieldId = `${selectFieldId}_option`
    let n = 1
    while (fieldIds.has(optionFieldId)) {
      optionFieldId = `${selectFieldId}_option_${++n}`
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

    const existingInOptGrid = fixed.layoutNodes!.filter((n) => n.gridId === optGridId && n.fieldId === labelFieldId)
    const hasNewNode = fixed.layoutNodes!.some((n) => n.gridId === optGridId && n.fieldId === optionFieldId)
    if (existingInOptGrid.length > 0 && !hasNewNode) {
      const maxOrder = Math.max(0, ...fixed.layoutNodes!.filter((n) => n.gridId === optGridId).map((n) => n.order ?? 0))
      fixed.layoutNodes = fixed.layoutNodes!.filter((n) => !(n.gridId === optGridId && n.fieldId === labelFieldId))
      fixed.layoutNodes!.push({ gridId: optGridId, fieldId: optionFieldId, order: maxOrder + 1 })
    } else if (!hasNewNode) {
      fixed.layoutNodes!.push({ gridId: optGridId, fieldId: optionFieldId, order: 1 })
    }

    const newLabelPath = `${optGridId}.${optionFieldId}`
    fixed.bindings![fieldPath] = {
      ...entry,
      labelField: newLabelPath,
      fieldMappings: (entry.fieldMappings ?? []).map((m) =>
        m.from === entry.labelField ? { ...m, from: newLabelPath } : m
      ),
    }
  }

  const getGridInfo = (fieldId: string): { tabId: string; gridId: string } | null => {
    const layoutNode = layoutNodes.find((n) => n.fieldId === fieldId)
    if (!layoutNode) return null
    const grid = grids.find((g) => g.id === layoutNode.gridId)
    if (!grid) return null
    const section = sections.find((s) => s.id === grid.sectionId)
    if (!section) return null
    return { tabId: section.tabId, gridId: grid.id }
  }

  const ensureMasterDataContainer = () => {
    if (!tabIds.has(container.tabId)) {
      const maxPlaceId = Math.max(0, ...fixed.tabs!.map((t) => t.placeId ?? 0))
      fixed.tabs!.push({
        id: container.tabId,
        name: container.tabName,
        placeId: maxPlaceId + 100,
        config: {},
      })
      tabIds.add(container.tabId)
    }
    if (!sectionIds.has(container.sectionId)) {
      fixed.sections!.push({
        id: container.sectionId,
        name: container.sectionName,
        tabId: container.tabId,
        placeId: 1,
        config: {},
      })
      sectionIds.add(container.sectionId)
    }
  }

  let gridPlaceId = Math.max(
    0,
    ...fixed.grids!.filter((g) => g.sectionId === container.sectionId).map((g) => g.placeId ?? 0)
  )

  for (const field of fixed.fields!) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue
    if (!useLocalOptions) continue

    const gridInfo = getGridInfo(field.id)
    if (!gridInfo) continue

    const fieldPath = `${gridInfo.gridId}.${field.id}`
    if (fixed.bindings![fieldPath]) continue

    ensureMasterDataContainer()

    const baseName = field.id.replace(/_/g, ' ')
    const optionsGridId = `${field.id}_options_grid`
    let optionFieldId = `${field.id}_option`
    let n = 1
    while (fieldIds.has(optionFieldId)) {
      optionFieldId = `${field.id}_option_${++n}`
    }

    if (!gridIds.has(optionsGridId)) {
      gridPlaceId++
      fixed.grids!.push({
        id: optionsGridId,
        name: `${titleCase(baseName)}`,
        type: 'table',
        sectionId: container.sectionId,
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
