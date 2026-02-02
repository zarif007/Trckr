/**
 * Validation and auto-fix for tracker schema integrity.
 * Ensures layoutNodes reference existing grids/fields and options/multiselect fields have an option source.
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
  optionTables?: Array<{ id: string; options?: Array<{ label?: string; value?: unknown }> }>
  optionMaps?: Array<{ id: string; tabId?: string; gridId?: string; labelFieldId?: string; valueFieldId?: string }>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateTracker(tracker: TrackerLike | null | undefined): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!tracker) {
    return { valid: true, errors: [], warnings: [] }
  }

  const tabs = tracker.tabs ?? []
  const sections = tracker.sections ?? []
  const grids = tracker.grids ?? []
  const fields = tracker.fields ?? []
  const layoutNodes = tracker.layoutNodes ?? []
  const optionTables = tracker.optionTables ?? []
  const optionMaps = tracker.optionMaps ?? []

  const tabIds = new Set(tabs.map((t) => t.id))
  const sectionIds = new Set(sections.map((s) => s.id))
  const gridIds = new Set(grids.map((g) => g.id))
  const fieldIds = new Set(fields.map((f) => f.id))
  const optionTableIds = new Set(optionTables.map((t) => t.id))
  const optionMapIds = new Set(optionMaps.map((m) => m.id))

  // LayoutNodes: every gridId must exist in grids, every fieldId must exist in fields
  for (const node of layoutNodes) {
    if (!gridIds.has(node.gridId)) {
      errors.push(`layoutNode references missing gridId "${node.gridId}"`)
    }
    if (!fieldIds.has(node.fieldId)) {
      errors.push(`layoutNode references missing fieldId "${node.fieldId}"`)
    }
  }

  // Sections: every tabId must exist in tabs
  for (const section of sections) {
    if (!tabIds.has(section.tabId)) {
      errors.push(`section "${section.id}" references missing tabId "${section.tabId}"`)
    }
  }

  // Grids: every sectionId must exist in sections
  for (const grid of grids) {
    if (!sectionIds.has(grid.sectionId)) {
      errors.push(`grid "${grid.id}" references missing sectionId "${grid.sectionId}"`)
    }
  }

  // Options/multiselect fields: must have optionMapId or optionTableId (or legacy optionsMappingId)
  for (const field of fields) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue
    const config = field.config ?? {}
    const optionMapId = config.optionMapId as string | undefined
    const optionTableId = (config.optionTableId ?? config.optionsMappingId) as string | undefined
    if (optionMapId && optionMapIds.has(optionMapId)) continue
    if (optionTableId && optionTableIds.has(optionTableId)) continue
    if (optionMapId && !optionMapIds.has(optionMapId)) {
      errors.push(`field "${field.id}" (options/multiselect) has optionMapId "${optionMapId}" but no matching optionMaps entry`)
    } else if (optionTableId && !optionTableIds.has(optionTableId)) {
      errors.push(`field "${field.id}" (options/multiselect) has optionTableId "${optionTableId}" but no matching optionTables entry`)
    } else {
      errors.push(`field "${field.id}" (options/multiselect) has no option source; set config.optionMapId or config.optionTableId`)
    }
  }

  const valid = errors.length === 0
  return { valid, errors, warnings }
}

/**
 * Auto-fix missing optionMaps entries and Shared tab infrastructure.
 * For every options/multiselect field with optionMapId that doesn't have a corresponding optionMaps entry,
 * this creates the full Shared tab infrastructure: tab, section, grid, fields, layoutNodes, and optionMaps entry.
 * 
 * Returns a new tracker object with the fixes applied (does not mutate input).
 */
export function autoFixOptionMaps<T extends TrackerLike>(tracker: T): T {
  if (!tracker) return tracker

  // Deep clone to avoid mutation
  const fixed: TrackerLike = {
    tabs: [...(tracker.tabs ?? [])],
    sections: [...(tracker.sections ?? [])],
    grids: [...(tracker.grids ?? [])],
    fields: [...(tracker.fields ?? [])],
    layoutNodes: [...(tracker.layoutNodes ?? [])],
    optionTables: [...(tracker.optionTables ?? [])],
    optionMaps: [...(tracker.optionMaps ?? [])],
  }

  const optionMapIds = new Set(fixed.optionMaps!.map((m) => m.id))
  const optionTableIds = new Set(fixed.optionTables!.map((t) => t.id))
  const gridIds = new Set(fixed.grids!.map((g) => g.id))
  const fieldIds = new Set(fixed.fields!.map((f) => f.id))
  const tabIds = new Set(fixed.tabs!.map((t) => t.id))
  const sectionIds = new Set(fixed.sections!.map((s) => s.id))

  // Collect fields that need optionMaps created
  const fieldsNeedingOptionMaps: Array<{ field: NonNullable<TrackerLike['fields']>[number]; optionMapId: string }> = []

  for (const field of fixed.fields!) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue
    const config = field.config ?? {}
    const optionMapId = config.optionMapId as string | undefined
    const optionTableId = (config.optionTableId ?? config.optionsMappingId) as string | undefined

    // Skip if already has a valid option source
    if (optionMapId && optionMapIds.has(optionMapId)) continue
    if (optionTableId && optionTableIds.has(optionTableId)) continue

    // If has optionMapId but no matching entry, add to fix list
    if (optionMapId) {
      fieldsNeedingOptionMaps.push({ field, optionMapId })
    } else if (!optionTableId) {
      // No option source at all - create an optionMapId and add to fix list
      const generatedMapId = `${field.id}_map`
      field.config = { ...config, optionMapId: generatedMapId }
      fieldsNeedingOptionMaps.push({ field, optionMapId: generatedMapId })
    }
  }

  if (fieldsNeedingOptionMaps.length === 0) {
    return tracker // No fixes needed
  }

  // Ensure Shared tab exists
  const SHARED_TAB_ID = 'shared_tab'
  const SHARED_SECTION_ID = 'option_lists_section'

  if (!tabIds.has(SHARED_TAB_ID)) {
    const maxPlaceId = Math.max(0, ...fixed.tabs!.map((t) => t.placeId ?? 0))
    fixed.tabs!.push({
      id: SHARED_TAB_ID,
      name: 'Shared',
      placeId: maxPlaceId + 100, // Put at end
      config: {},
    })
    tabIds.add(SHARED_TAB_ID)
  }

  // Ensure Shared section exists
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

  // Create infrastructure for each missing optionMap
  let gridPlaceId = Math.max(0, ...fixed.grids!.filter((g) => g.sectionId === SHARED_SECTION_ID).map((g) => g.placeId ?? 0))

  for (const { field, optionMapId } of fieldsNeedingOptionMaps) {
    // Generate unique IDs based on optionMapId
    const baseName = optionMapId.replace(/_map$/, '').replace(/_/g, ' ')
    const gridId = `${optionMapId.replace(/_map$/, '')}_options_grid`
    const labelFieldId = `${optionMapId.replace(/_map$/, '')}_opt_label`
    const valueFieldId = `${optionMapId.replace(/_map$/, '')}_opt_value`

    // Skip if grid already exists (partial fix)
    if (gridIds.has(gridId)) continue

    gridPlaceId++

    // Create the options grid
    fixed.grids!.push({
      id: gridId,
      name: `${titleCase(baseName)} Options`,
      type: 'table',
      sectionId: SHARED_SECTION_ID,
      placeId: gridPlaceId,
      config: {},
    })
    gridIds.add(gridId)

    // Create label field
    if (!fieldIds.has(labelFieldId)) {
      fixed.fields!.push({
        id: labelFieldId,
        dataType: 'string',
        ui: { label: 'Label', placeholder: 'Display text' },
        config: { isRequired: true },
      })
      fieldIds.add(labelFieldId)
    }

    // Create value field
    if (!fieldIds.has(valueFieldId)) {
      fixed.fields!.push({
        id: valueFieldId,
        dataType: 'string',
        ui: { label: 'Value', placeholder: 'Stored value' },
        config: { isRequired: true },
      })
      fieldIds.add(valueFieldId)
    }

    // Create layoutNodes
    const existingNodes = fixed.layoutNodes!.filter((n) => n.gridId === gridId)
    if (!existingNodes.some((n) => n.fieldId === labelFieldId)) {
      fixed.layoutNodes!.push({ gridId, fieldId: labelFieldId, order: 1 })
    }
    if (!existingNodes.some((n) => n.fieldId === valueFieldId)) {
      fixed.layoutNodes!.push({ gridId, fieldId: valueFieldId, order: 2 })
    }

    // Create optionMaps entry
    if (!optionMapIds.has(optionMapId)) {
      fixed.optionMaps!.push({
        id: optionMapId,
        tabId: SHARED_TAB_ID,
        gridId: gridId,
        labelFieldId: labelFieldId,
        valueFieldId: valueFieldId,
      })
      optionMapIds.add(optionMapId)
    }
  }

  return { ...tracker, ...fixed } as T
}

/** Convert snake_case or camelCase to Title Case */
function titleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
