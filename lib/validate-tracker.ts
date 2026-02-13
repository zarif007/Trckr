/**
 * Validation and auto-fix for tracker schema integrity.
 * Ensures layoutNodes reference existing grids/fields and options/multiselect fields have an option source.
 */

import { parsePath } from './resolve-bindings'
import { KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS } from './dynamic-options-functions'

/** Binding entry structure for validation (no valueField - value is in fieldMappings) */
interface BindingEntry {
  optionsGrid: string
  labelField: string
  fieldMappings: Array<{ from: string; to: string }>
}

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
  bindings?: Record<string, BindingEntry>
  dependsOn?: Array<{ source?: string; targets?: string[]; action?: string; operator?: string; value?: unknown }>
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

  const tabIds = new Set(tabs.map((t) => t.id))
  const sectionIds = new Set(sections.map((s) => s.id))
  const gridIds = new Set(grids.map((g) => g.id))
  const fieldIds = new Set(fields.map((f) => f.id))

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

  // Options/multiselect fields: must have bindings (buildBindingsFromSchema runs before validation).
  const bindings = tracker.bindings ?? {}
  for (const field of fields) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue
    const layoutNode = layoutNodes.find((n) => n.fieldId === field.id)
    const grid = layoutNode ? grids.find((g) => g.id === layoutNode.gridId) : null
    const fieldPath = grid ? `${grid.id}.${field.id}` : null
    const hasBinding = fieldPath ? (bindings[fieldPath] !== undefined) : false
    if (!hasBinding) {
      warnings.push(`field "${field.id}" (options/multiselect) has no bindings entry; run buildBindingsFromSchema or ask AI to add bindings`)
    }
  }

  // Validate bindings (warning-level only)
  const bindingWarnings = validateBindings(tracker)
  warnings.push(...bindingWarnings)

  // Validate dependsOn rules (warning-level only)
  const dependsOnWarnings = validateDependsOn(tracker)
  warnings.push(...dependsOnWarnings)

  const valid = errors.length === 0
  return { valid, errors, warnings }
}

/**
 * Validate dependsOn rules (warning-level only).
 */
export function validateDependsOn(tracker: TrackerLike): string[] {
  const warnings: string[] = []
  const rules = tracker.dependsOn ?? []

  if (!Array.isArray(rules) || rules.length === 0) return warnings

  const gridIds = new Set((tracker.grids ?? []).map((g) => g.id))
  const fieldIds = new Set((tracker.fields ?? []).map((f) => f.id))

  for (const [idx, rule] of rules.entries()) {
    if (!rule?.source) {
      warnings.push(`dependsOn[${idx}]: missing source`)
      continue
    }
    const sourceParsed = parsePath(rule.source)
    if (!sourceParsed.gridId || !gridIds.has(sourceParsed.gridId)) {
      warnings.push(`dependsOn[${idx}]: source grid "${sourceParsed.gridId}" not found`)
    }
    if (!sourceParsed.fieldId || !fieldIds.has(sourceParsed.fieldId)) {
      warnings.push(`dependsOn[${idx}]: source field "${sourceParsed.fieldId}" not found`)
    }
    const targets = rule.targets ?? []
    if (!Array.isArray(targets) || targets.length === 0) {
      warnings.push(`dependsOn[${idx}]: no targets provided`)
      continue
    }
    for (const target of targets) {
      const targetParsed = parsePath(target)
      if (!targetParsed.gridId || !gridIds.has(targetParsed.gridId)) {
        warnings.push(`dependsOn[${idx}]: target grid "${targetParsed.gridId}" not found`)
      }
      if (!targetParsed.fieldId || !fieldIds.has(targetParsed.fieldId)) {
        warnings.push(`dependsOn[${idx}]: target field "${targetParsed.fieldId}" not found`)
      }
    }
  }

  return warnings
}

/**
 * Validate bindings entries.
 * Returns warnings (not errors) for invalid bindings - they will be skipped at runtime.
 */
export function validateBindings(tracker: TrackerLike): string[] {
  const warnings: string[] = []
  const bindings = tracker.bindings ?? {}

  // Build lookup sets
  const tabIds = new Set((tracker.tabs ?? []).map((t) => t.id))
  const gridIds = new Set((tracker.grids ?? []).map((g) => g.id))
  const fieldIds = new Set((tracker.fields ?? []).map((f) => f.id))
  const sections = tracker.sections ?? []
  const grids = tracker.grids ?? []
  const layoutNodes = tracker.layoutNodes ?? []

  // Helper to get the grid a field is in
  const getFieldGridInfo = (fId: string): { tabId: string; gridId: string } | null => {
    const layoutNode = layoutNodes.find((n) => n.fieldId === fId)
    if (!layoutNode) return null
    const grid = grids.find((g) => g.id === layoutNode.gridId)
    if (!grid) return null
    const section = sections.find((s) => s.id === grid.sectionId)
    if (!section) return null
    return { tabId: section.tabId, gridId: grid.id }
  }

  // Check each binding entry (key is grid.field)
  for (const [fieldPath, entry] of Object.entries(bindings)) {
    const { gridId, fieldId } = parsePath(fieldPath)

    // Validate the key (field path = grid_id.field_id)
    if (!gridId || !gridIds.has(gridId)) {
      warnings.push(`Binding key "${fieldPath}": grid "${gridId}" not found`)
    }
    if (!fieldId || !fieldIds.has(fieldId)) {
      warnings.push(`Binding key "${fieldPath}": field "${fieldId}" not found`)
    }

    // Validate optionsGrid (grid id only, or legacy tab.grid); must be an options grid (id ends with _options_grid)
    const optGridId = entry.optionsGrid?.includes('.') ? entry.optionsGrid.split('.').pop()! : entry.optionsGrid
    if (!optGridId || !gridIds.has(optGridId)) {
      warnings.push(`Binding "${fieldPath}": optionsGrid "${entry.optionsGrid}" not found`)
    } else if (!optGridId.endsWith('_options_grid')) {
      warnings.push(`Binding "${fieldPath}": optionsGrid "${entry.optionsGrid}" should be an options grid (id ending with _options_grid), not a main data grid`)
    }

    // Validate labelField
    const labelParsed = parsePath(entry.labelField)
    if (!labelParsed.fieldId || !fieldIds.has(labelParsed.fieldId)) {
      warnings.push(`Binding "${fieldPath}": labelField "${entry.labelField}" not found`)
    }

    // fieldMappings must include one where "to" === fieldPath (the value mapping)
    const valueMapping = (entry.fieldMappings ?? []).find((m) => m.to === fieldPath)
    if (!valueMapping) {
      warnings.push(`Binding "${fieldPath}": fieldMappings must include one entry where "to" is "${fieldPath}" (the stored value)`)
    }

    // Validate fieldMappings
    for (const mapping of entry.fieldMappings ?? []) {
      const fromParsed = parsePath(mapping.from)
      const toParsed = parsePath(mapping.to)

      if (!fromParsed.fieldId || !fieldIds.has(fromParsed.fieldId)) {
        warnings.push(`Binding "${fieldPath}": source field "${mapping.from}" not found`)
      }
      if (!toParsed.fieldId || !fieldIds.has(toParsed.fieldId)) {
        warnings.push(`Binding "${fieldPath}": target field "${mapping.to}" not found`)
      }
    }
  }

  // Check for missing bindings on select/multiselect fields (key is grid.field). Skip dynamic_select/dynamic_multiselect (they use dynamicOptionsFunction, not bindings).
  for (const field of tracker.fields ?? []) {
    if (field.dataType === 'dynamic_select' || field.dataType === 'dynamic_multiselect') {
      const functionId = (field.config as { dynamicOptionsFunction?: string } | undefined)?.dynamicOptionsFunction
      if (functionId && !(KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS as readonly string[]).includes(functionId)) {
        warnings.push(`Dynamic select field "${field.id}" uses unknown dynamicOptionsFunction "${functionId}"`)
      }
      continue
    }
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue

    const gridInfo = getFieldGridInfo(field.id)
    if (!gridInfo) continue

    const fieldPath = `${gridInfo.gridId}.${field.id}`

    const hasBinding = bindings[fieldPath] !== undefined
    if (!hasBinding) {
      warnings.push(`Select field "${fieldPath}" has no bindings entry`)
    }
  }

  return warnings
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

/**
 * Auto-fix missing bindings entries for select/multiselect fields.
 * Creates default bindings with Shared tab infrastructure for fields without a bindings entry.
 * Returns a new tracker object with the fixes applied (does not mutate input).
 */
export function autoFixBindings<T extends TrackerLike>(tracker: T): T {
  if (!tracker) return tracker

  // Deep clone to avoid mutation
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

  // Helper to get the grid a field is in
  const getFieldGridInfo = (fId: string): { tabId: string; gridId: string } | null => {
    const layoutNode = layoutNodes.find((n) => n.fieldId === fId)
    if (!layoutNode) return null
    const grid = grids.find((g) => g.id === layoutNode.gridId)
    if (!grid) return null
    const section = sections.find((s) => s.id === grid.sectionId)
    if (!section) return null
    return { tabId: section.tabId, gridId: grid.id }
  }

  // Ensure Shared tab exists
  const SHARED_TAB_ID = 'shared_tab'
  const SHARED_SECTION_ID = 'option_lists_section'

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

  let gridPlaceId = Math.max(0, ...fixed.grids!.filter((g) => g.sectionId === SHARED_SECTION_ID).map((g) => g.placeId ?? 0))

  // Process each select/multiselect field
  for (const field of fixed.fields!) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue

    const gridInfo = getFieldGridInfo(field.id)
    if (!gridInfo) continue // Field not placed in any grid

    const fieldPath = `${gridInfo.gridId}.${field.id}`

    // Skip if binding already exists
    if (fixed.bindings![fieldPath]) continue

    // No binding: create Shared tab infrastructure and default binding
    ensureSharedTabInfrastructure()

    const baseName = field.id.replace(/_/g, ' ')
    const optionsGridId = `${field.id}_options_grid`
    const optionFieldId = field.id

    // Create options grid if it doesn't exist
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

    // Create single option field if it doesn't exist (display = value)
    if (!fieldIds.has(optionFieldId)) {
      fixed.fields!.push({
        id: optionFieldId,
        dataType: 'string',
        ui: { label: titleCase(baseName), placeholder: 'Option name' },
        config: { isRequired: true },
      })
      fieldIds.add(optionFieldId)
    }

    // Create layoutNode for the option field
    const existingNodes = fixed.layoutNodes!.filter((n) => n.gridId === optionsGridId)
    if (!existingNodes.some((n) => n.fieldId === optionFieldId)) {
      fixed.layoutNodes!.push({ gridId: optionsGridId, fieldId: optionFieldId, order: 1 })
    }

    // Create bindings entry: labelField = option field path (same field provides display and value)
    const optionFieldPath = `${optionsGridId}.${optionFieldId}`
    fixed.bindings![fieldPath] = {
      optionsGrid: optionsGridId,
      labelField: optionFieldPath,
      fieldMappings: [{ from: optionFieldPath, to: fieldPath }],
    }
  }

  return { ...tracker, ...fixed } as T
}
