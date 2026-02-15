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
} from '../types'

/** Field types allowed when creating a new field (no bindings required). */
export const SIMPLE_FIELD_TYPES: TrackerFieldType[] = [
  'string',
  'number',
  'date',
  'boolean',
  'text',
]

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

export function getSimpleFieldTypes(): TrackerFieldType[] {
  return [...SIMPLE_FIELD_TYPES]
}

// --- Section / grid block editing ---

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
