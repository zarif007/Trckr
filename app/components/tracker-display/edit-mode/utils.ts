/**
 * Edit mode utilities: field id generation, new field creation, layout order,
 * section/grid id and placeId for block-level editing.
 */

import type {
  TrackerField,
  TrackerLayoutNode,
  TrackerFieldType,
  TrackerSection,
  TrackerGrid,
  TrackerTab,
} from '../types'

/** All field types that can be created from the Add Field dialog. Includes simple types and option-based (options configured later). */
export const CREATABLE_FIELD_TYPES: TrackerFieldType[] = [
  'string',
  'number',
  'date',
  'boolean',
  'text',
  'link',
  'currency',
  'percentage',
  'options',
  'multiselect',
  'dynamic_select',
  'dynamic_multiselect',
]

/** Human-readable labels for each creatable field type. */
export const FIELD_TYPE_LABELS: Record<TrackerFieldType, string> = {
  string: 'Short text',
  number: 'Number',
  date: 'Date',
  boolean: 'Checkbox',
  text: 'Long text',
  link: 'Link',
  currency: 'Currency',
  percentage: 'Percentage',
  options: 'Single select',
  multiselect: 'Multi select',
  dynamic_select: 'Dynamic single select',
  dynamic_multiselect: 'Dynamic multi select',
}

/** @deprecated Use getCreatableFieldTypes() or getCreatableFieldTypesWithLabels() instead. */
export const SIMPLE_FIELD_TYPES: TrackerFieldType[] = CREATABLE_FIELD_TYPES

/** Convert label to snake_case id. Collision-safe by appending _1, _2, ... if needed. */
export function createNewFieldId(label: string, existingIds: Set<string>): string {
  const base = label
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase() || 'field'
  let id = base
  let n = 1
  while (existingIds.has(id)) {
    id = `${base}_${n}`
    n += 1
  }
  return id
}

/** Create a new field definition. Uses simple types only (no options/multiselect bindings). */
export function createNewField(
  label: string,
  dataType: TrackerFieldType,
  existingIds: Set<string>
): TrackerField {
  const id = createNewFieldId(label, existingIds)
  return {
    id,
    dataType,
    ui: { label: label.trim() || id },
    config: {},
  }
}

/** Get the next order value for a layoutNode in the given grid. */
export function getNextLayoutOrder(
  layoutNodes: TrackerLayoutNode[],
  gridId: string
): number {
  const orders = layoutNodes
    .filter((n) => n.gridId === gridId)
    .map((n) => n.order)
  if (orders.length === 0) return 0
  return Math.max(...orders) + 1
}

/** Next (row, col) slot for div grid layout. New fields are always added in a new row (col 0); user can drag-and-drop to place beside others. */
export function getNextRowCol(
  layoutNodes: TrackerLayoutNode[],
  gridId: string
): { row: number; col: number } {
  const nodes = layoutNodes.filter((n) => n.gridId === gridId)
  const withPos = nodes.filter((n) => n.row != null && n.col != null)
  if (withPos.length === 0) {
    const order = nodes.length === 0 ? 0 : Math.max(...nodes.map((n) => n.order)) + 1
    return { row: order, col: 0 }
  }
  const maxRow = Math.max(...withPos.map((n) => n.row ?? 0))
  return { row: maxRow + 1, col: 0 }
}

export function getSimpleFieldTypes(): TrackerFieldType[] {
  return [...CREATABLE_FIELD_TYPES]
}

export interface FieldTypeOption {
  value: TrackerFieldType
  label: string
  group?: string
}

/** Returns all creatable field types with human-readable labels, optionally grouped. */
export function getCreatableFieldTypesWithLabels(): FieldTypeOption[] {
  const groups: Record<string, TrackerFieldType[]> = {
    Text: ['string', 'text', 'link'],
    Numbers: ['number', 'currency', 'percentage'],
    'Date & time': ['date'],
    Choice: ['options', 'multiselect', 'dynamic_select', 'dynamic_multiselect'],
    Other: ['boolean'],
  }
  const order: TrackerFieldType[] = [
    'string',
    'text',
    'link',
    'number',
    'currency',
    'percentage',
    'date',
    'options',
    'multiselect',
    'dynamic_select',
    'dynamic_multiselect',
    'boolean',
  ]
  return order.map((value) => ({
    value,
    label: FIELD_TYPE_LABELS[value],
    group: Object.entries(groups).find(([, types]) => types.includes(value))?.[0],
  }))
}

// --- Tab / section / grid block editing ---

/** Collision-safe tab id (e.g. tab_1, tab_2). */
export function createNewTabId(existingIds: Set<string>): string {
  let id = 'tab_1'
  let n = 1
  while (existingIds.has(id)) {
    n += 1
    id = `tab_${n}`
  }
  return id
}

/** Next placeId for tabs (after existing tabs). */
export function getNextTabPlaceId(tabs: TrackerTab[]): number {
  if (tabs.length === 0) return 0
  return Math.max(...tabs.map((t) => t.placeId)) + 1
}

/** Collision-safe section id. */
export function createNewSectionId(existingIds: Set<string>): string {
  let id = 'section'
  let n = 1
  while (existingIds.has(id)) {
    id = `section_${n}`
    n += 1
  }
  return id
}

/** Collision-safe grid id. */
export function createNewGridId(existingIds: Set<string>): string {
  let id = 'grid'
  let n = 1
  while (existingIds.has(id)) {
    id = `grid_${n}`
    n += 1
  }
  return id
}

/** Next placeId for a section in the given tab (after existing sections). */
export function getNextSectionPlaceId(
  sections: TrackerSection[],
  tabId: string,
  afterPlaceId?: number
): number {
  const inTab = sections.filter((s) => s.tabId === tabId)
  if (afterPlaceId == null) {
    if (inTab.length === 0) return 0
    return Math.max(...inTab.map((s) => s.placeId)) + 1
  }
  const maxBefore = inTab
    .filter((s) => s.placeId <= afterPlaceId)
    .reduce((acc, s) => Math.max(acc, s.placeId), -1)
  return maxBefore + 1
}

/** Next placeId for a grid in the given section (after existing grids). */
export function getNextGridPlaceId(
  grids: TrackerGrid[],
  sectionId: string,
  afterPlaceId?: number
): number {
  const inSection = grids.filter((g) => g.sectionId === sectionId)
  if (afterPlaceId == null) {
    if (inSection.length === 0) return 0
    return Math.max(...inSection.map((g) => g.placeId)) + 1
  }
  const maxBefore = inSection
    .filter((g) => g.placeId <= afterPlaceId)
    .reduce((acc, g) => Math.max(acc, g.placeId), -1)
  return maxBefore + 1
}
