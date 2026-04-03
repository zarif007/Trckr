/**
 * Build bindings from tracker schema: ensure every select/multiselect has a binding
 * pointing to a master data grid; create Master Data tab and grids when missing.
 */

import type { TrackerLike } from './types'
import { MASTER_DATA_SECTION_ID, MASTER_DATA_TAB_ID } from '@/lib/master-data/constants'
import { resolveMasterDataScopeFromTracker } from '@/lib/master-data-scope'

const LEGACY_SHARED_TAB_ID = 'shared_tab'
const LEGACY_SHARED_SECTION_ID = 'option_lists_section'

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Return label and value field ids for an options grid. Single-field grids (one field
 * for both display and value) return the same id for both; legacy _label/_value grids
 * return the two field ids.
 */
export function getOptionGridLabelAndValueFieldIds(
  gridId: string,
  layoutNodes: Array<{ gridId: string; fieldId: string; order?: number }>
): { labelFieldId: string; valueFieldId: string } | null {
  const nodes = layoutNodes
    .filter((n) => n.gridId === gridId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (nodes.length < 1) return null

  const fieldIds = nodes
    .map((n) => n.fieldId)
    .filter((id): id is string => typeof id === 'string')
  if (fieldIds.length < 1) return null

  const hasLabel = fieldIds.find((id) => id.endsWith('_label') || id.endsWith('_opt_label'))
  const hasValue = fieldIds.find((id) => id.endsWith('_value') || id.endsWith('_opt_value'))
  if (hasLabel && hasValue) {
    return { labelFieldId: hasLabel, valueFieldId: hasValue }
  }
  const singleField = fieldIds[0]!
  return { labelFieldId: singleField, valueFieldId: singleField }
}

function isOptionsGrid(gridId: string): boolean {
  return gridId.endsWith('_options_grid')
}

/**
 * Ensure an options grid exists for the given field id: creates Master Data tab, section,
 * grid, one option field, and layoutNodes if missing. Mutates fixed in place.
 * Returns the options grid id (always {fieldId}_options_grid).
 */
function ensureOptionsGridForField(
  fieldId: string,
  fixed: TrackerLike,
  container: { tabId: string; tabName: string; sectionId: string; sectionName: string }
): string {
  let tabs = [...(fixed.tabs ?? [])]
  let sections = [...(fixed.sections ?? [])]
  let grids = [...(fixed.grids ?? [])]
  let fields = [...(fixed.fields ?? [])]
  let layoutNodes = [...(fixed.layoutNodes ?? [])]
  const tabIds = new Set(tabs.map((t) => t.id))
  const sectionIds = new Set(sections.map((s) => s.id))
  const gridIds = new Set(grids.map((g) => g.id))
  const fieldIds = new Set(fields.map((f) => f.id))

  const optionsGridId = `${fieldId}_options_grid`
  const optionFieldId = `${fieldId}_option`

  if (gridIds.has(optionsGridId)) {
    return optionsGridId
  }

  if (!tabIds.has(container.tabId)) {
    const maxPlaceId = Math.max(0, ...tabs.map((t) => t.placeId ?? 0))
    tabs = [...tabs, { id: container.tabId, name: container.tabName, placeId: maxPlaceId + 100, config: {} }]
    tabIds.add(container.tabId)
  }
  if (!sectionIds.has(container.sectionId)) {
    sections = [
      ...sections,
      {
        id: container.sectionId,
        name: container.sectionName,
        tabId: container.tabId,
        placeId: 1,
        config: {},
      },
    ]
    sectionIds.add(container.sectionId)
  }

  const gridPlaceId =
    Math.max(0, ...grids.filter((g) => g.sectionId === container.sectionId).map((g) => g.placeId ?? 0)) + 1
  const baseName = fieldId.replace(/_/g, ' ')
  grids = [
    ...grids,
    {
      id: optionsGridId,
      name: `${titleCase(baseName)}`,
      type: 'table',
      sectionId: container.sectionId,
      placeId: gridPlaceId,
      config: {},
    },
  ]

  if (!fieldIds.has(optionFieldId)) {
    fields = [
      ...fields,
      {
        id: optionFieldId,
        dataType: 'string',
        ui: { label: titleCase(baseName), placeholder: 'Option name' },
        config: { isRequired: true },
      },
    ]
    fieldIds.add(optionFieldId)
  }

  const existingNodes = layoutNodes.filter((n) => n.gridId === optionsGridId)
  if (!existingNodes.some((n) => n.fieldId === optionFieldId)) {
    layoutNodes = [...layoutNodes, { gridId: optionsGridId, fieldId: optionFieldId, order: 1 }]
  }

  fixed.tabs = tabs
  fixed.sections = sections
  fixed.grids = grids
  fixed.fields = fields
  fixed.layoutNodes = layoutNodes
  return optionsGridId
}

/**
 * Build or repair bindings from the tracker schema. For every select/multiselect field,
 * ensures a binding exists that points to an options grid (id ending with _options_grid).
 * Creates missing option grids (Shared tab, section, grid, field, layoutNodes). Preserves
 * existing bindings' fieldMappings when present; only adds missing value mapping.
 */
export function buildBindingsFromSchema<T extends TrackerLike>(tracker: T): T {
  if (!tracker?.fields?.length) return tracker

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

  const optionGridMeta: Partial<
    Record<string, { labelFieldId: string; valueFieldId: string }>
  > = {}
  const refreshOptionGridMeta = () => {
    for (const grid of fixed.grids ?? []) {
      if (!isOptionsGrid(grid.id)) continue
      const meta = getOptionGridLabelAndValueFieldIds(grid.id, fixed.layoutNodes ?? [])
      if (meta) optionGridMeta[grid.id] = meta
    }
  }
  refreshOptionGridMeta()

  const getFieldGridId = (fieldId: string): string | null => {
    const node = (fixed.layoutNodes ?? []).find((n) => n.fieldId === fieldId)
    return node ? node.gridId : null
  }

  for (const field of fixed.fields!) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue

    const gridId = getFieldGridId(field.id)
    if (!gridId) continue

    const fieldPath = `${gridId}.${field.id}`
    const existing = fixed.bindings![fieldPath]
    const foreignSource = Boolean(existing?.optionsSourceSchemaId?.trim())

    if (foreignSource) {
      if (existing?.labelField) {
        const valueMapping = { from: existing.labelField, to: fieldPath }
        const hasValueMapping = existing.fieldMappings?.some((m) => m.to === fieldPath)
        fixed.bindings![fieldPath] = {
          optionsGrid: existing.optionsGrid,
          labelField: existing.labelField,
          optionsSourceSchemaId: existing.optionsSourceSchemaId,
          ...(existing.optionsSourceKey ? { optionsSourceKey: existing.optionsSourceKey } : {}),
          fieldMappings: hasValueMapping ? existing.fieldMappings : [valueMapping, ...(existing.fieldMappings ?? [])],
        }
      }
      continue
    }

    if (!useLocalOptions) {
      continue
    }

    const optionsGridId = `${field.id}_options_grid`

    let labelFieldId: string
    let valueFieldId: string

    if (optionGridMeta[optionsGridId]) {
      labelFieldId = optionGridMeta[optionsGridId].labelFieldId
      valueFieldId = optionGridMeta[optionsGridId].valueFieldId
    } else {
      const existingGrid = (fixed.grids ?? []).find((g) => g.id === optionsGridId)
      if (existingGrid) {
        const meta = getOptionGridLabelAndValueFieldIds(optionsGridId, fixed.layoutNodes ?? [])
        if (meta) {
          labelFieldId = meta.labelFieldId
          valueFieldId = meta.valueFieldId
          optionGridMeta[optionsGridId] = meta
        } else {
          ensureOptionsGridForField(field.id, fixed, container)
          refreshOptionGridMeta()
          const afterEnsure = getOptionGridLabelAndValueFieldIds(
            optionsGridId,
            fixed.layoutNodes ?? []
          )
          labelFieldId = afterEnsure?.labelFieldId ?? `${field.id}_option`
          valueFieldId = afterEnsure?.valueFieldId ?? labelFieldId
        }
      } else {
        ensureOptionsGridForField(field.id, fixed, container)
        refreshOptionGridMeta()
        const afterEnsure = getOptionGridLabelAndValueFieldIds(
          optionsGridId,
          fixed.layoutNodes ?? []
        )
        labelFieldId = afterEnsure?.labelFieldId ?? `${field.id}_option`
        valueFieldId = afterEnsure?.valueFieldId ?? labelFieldId
      }
    }

    const valueMapping = { from: `${optionsGridId}.${valueFieldId}`, to: fieldPath }
    if (existing?.fieldMappings?.length) {
      const hasValueMapping = existing.fieldMappings.some((m) => m.to === fieldPath)
      const fieldMappings = hasValueMapping
        ? existing.fieldMappings
        : [valueMapping, ...existing.fieldMappings]
      fixed.bindings![fieldPath] = {
        optionsGrid: existing.optionsGrid ?? optionsGridId,
        labelField: existing.labelField ?? `${optionsGridId}.${labelFieldId}`,
        fieldMappings,
      }
    } else {
      fixed.bindings![fieldPath] = {
        optionsGrid: optionsGridId,
        labelField: `${optionsGridId}.${labelFieldId}`,
        fieldMappings: [valueMapping],
      }
    }
  }

  const hasOptionGrids = (fixed.grids ?? []).some((g) => isOptionsGrid(g.id))
  if (hasOptionGrids && useLocalOptions) {
    const tabId = container.tabId
    const hasContainerTab = (fixed.tabs ?? []).some((t) => t.id === tabId)
    if (!hasContainerTab) {
      const maxPlaceId = Math.max(0, ...(fixed.tabs ?? []).map((t) => t.placeId ?? 0))
      fixed.tabs = [
        ...(fixed.tabs ?? []),
        { id: tabId, name: container.tabName, placeId: maxPlaceId + 100, config: {} },
      ]
    }
    if (fixed.tabs?.length) {
      fixed.tabs = fixed.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, config: { ...(tab.config ?? {}), isHidden: false } }
          : tab
      )
    }
  }

  return { ...tracker, ...fixed } as T
}
