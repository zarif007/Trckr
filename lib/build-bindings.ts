/**
 * Binding builder: derives/repairs bindings from tracker schema.
 * Ensures every select/multiselect has a binding pointing to an options grid (never a main data grid).
 */

export interface TrackerLike {
  tabs?: Array<{ id: string; name?: string; placeId?: number; config?: Record<string, unknown> }>
  sections?: Array<{ id: string; name?: string; tabId: string; placeId?: number; config?: Record<string, unknown> }>
  grids?: Array<{ id: string; name?: string; type?: string; sectionId: string; placeId?: number; config?: Record<string, unknown> }>
  fields?: Array<{
    id: string
    dataType: string
    ui?: { label?: string; placeholder?: string }
    config?: Record<string, unknown> | null
  }>
  layoutNodes?: Array<{ gridId: string; fieldId: string; order?: number }>
  bindings?: Record<string, { optionsGrid: string; labelField: string; fieldMappings: Array<{ from: string; to: string }> }>
}

const SHARED_TAB_ID = 'shared_tab'
const SHARED_SECTION_ID = 'option_lists_section'

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Given an options grid id, return label and value field ids from layoutNodes (by order or naming).
 */
export function getOptionGridLabelAndValueFieldIds(
  gridId: string,
  layoutNodes: Array<{ gridId: string; fieldId: string; order?: number }>
): { labelFieldId: string; valueFieldId: string } | null {
  const nodes = layoutNodes
    .filter((n) => n.gridId === gridId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (nodes.length < 2) return null

  const fieldIds = nodes.map((n) => n.fieldId)
  const hasLabel = fieldIds.find((id) => id.endsWith('_label') || id.endsWith('_opt_label'))
  const hasValue = fieldIds.find((id) => id.endsWith('_value') || id.endsWith('_opt_value'))
  if (hasLabel && hasValue) {
    return { labelFieldId: hasLabel, valueFieldId: hasValue }
  }
  return { labelFieldId: fieldIds[0], valueFieldId: fieldIds[1] }
}

/**
 * Ensure an options grid exists for the given field id. Creates Shared tab, section, grid, label/value fields, and layoutNodes if missing.
 * Returns the options grid id (always {fieldId}_options_grid). Mutates fixed in place.
 */
function ensureOptionsGridForField(fieldId: string, fixed: TrackerLike): string {
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
  const labelFieldId = `${fieldId}_opt_label`
  const valueFieldId = `${fieldId}_opt_value`

  if (gridIds.has(optionsGridId)) {
    return optionsGridId
  }

  if (!tabIds.has(SHARED_TAB_ID)) {
    const maxPlaceId = Math.max(0, ...tabs.map((t) => t.placeId ?? 0))
    tabs = [...tabs, { id: SHARED_TAB_ID, name: 'Shared', placeId: maxPlaceId + 100, config: {} }]
    tabIds.add(SHARED_TAB_ID)
  }
  if (!sectionIds.has(SHARED_SECTION_ID)) {
    sections = [...sections, { id: SHARED_SECTION_ID, name: 'Option Lists', tabId: SHARED_TAB_ID, placeId: 1, config: {} }]
    sectionIds.add(SHARED_SECTION_ID)
  }

  const gridPlaceId =
    Math.max(0, ...grids.filter((g) => g.sectionId === SHARED_SECTION_ID).map((g) => g.placeId ?? 0)) + 1
  const baseName = fieldId.replace(/_/g, ' ')
  grids = [
    ...grids,
    {
      id: optionsGridId,
      name: `${titleCase(baseName)} Options`,
      type: 'table',
      sectionId: SHARED_SECTION_ID,
      placeId: gridPlaceId,
      config: {},
    },
  ]

  if (!fieldIds.has(labelFieldId)) {
    fields = [
      ...fields,
      {
        id: labelFieldId,
        dataType: 'string',
        ui: { label: 'Label', placeholder: 'Display text' },
        config: { isRequired: true },
      },
    ]
    fieldIds.add(labelFieldId)
  }
  if (!fieldIds.has(valueFieldId)) {
    fields = [
      ...fields,
      {
        id: valueFieldId,
        dataType: 'string',
        ui: { label: 'Value', placeholder: 'Stored value' },
        config: { isRequired: true },
      },
    ]
  }

  const existingNodes = layoutNodes.filter((n) => n.gridId === optionsGridId)
  if (!existingNodes.some((n) => n.fieldId === labelFieldId)) {
    layoutNodes = [...layoutNodes, { gridId: optionsGridId, fieldId: labelFieldId, order: 1 }]
  }
  if (!existingNodes.some((n) => n.fieldId === valueFieldId)) {
    layoutNodes = [...layoutNodes, { gridId: optionsGridId, fieldId: valueFieldId, order: 2 }]
  }

  fixed.tabs = tabs
  fixed.sections = sections
  fixed.grids = grids
  fixed.fields = fields
  fixed.layoutNodes = layoutNodes
  return optionsGridId
}

/**
 * A grid is an "options grid" if its id ends with _options_grid. Main data grids must never be used as optionsGrid.
 */
function isOptionsGrid(gridId: string): boolean {
  return gridId.endsWith('_options_grid')
}

/**
 * Build or repair bindings from the tracker schema. For every select/multiselect field, ensures a binding exists
 * that points to an options grid (id ending with _options_grid), never to a main data grid. Creates missing
 * options grids and overwrites incorrect bindings.
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

  const optionGridMeta: Record<string, { labelFieldId: string; valueFieldId: string }> = {}
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
          ensureOptionsGridForField(field.id, fixed)
          refreshOptionGridMeta()
          labelFieldId = `${field.id}_opt_label`
          valueFieldId = `${field.id}_opt_value`
        }
      } else {
        ensureOptionsGridForField(field.id, fixed)
        refreshOptionGridMeta()
        labelFieldId = `${field.id}_opt_label`
        valueFieldId = `${field.id}_opt_value`
      }
    }

    fixed.bindings![fieldPath] = {
      optionsGrid: optionsGridId,
      labelField: `${optionsGridId}.${labelFieldId}`,
      fieldMappings: [{ from: `${optionsGridId}.${valueFieldId}`, to: fieldPath }],
    }
  }

  return { ...tracker, ...fixed } as T
}
