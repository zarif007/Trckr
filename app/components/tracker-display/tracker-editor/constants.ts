/**
 * Constants for tracker create/edit flows (from-scratch, empty state, etc.).
 * Single source of truth for "empty tracker" schema so all editor entry points stay consistent.
 */

import type { TrackerDisplayProps } from '../types'

/** Default tab name for the initial empty tab. */
export const DEFAULT_FIRST_TAB_NAME = 'Overview'

/** Default placeId for the first tab. */
export const DEFAULT_FIRST_TAB_PLACE_ID = 0

/**
 * Creates an empty tracker schema with one tab and no sections/grids/fields.
 * Use this for "create from scratch" flows so the user has a canvas to add blocks.
 */
export function createEmptyTrackerSchema(options?: {
  firstTabName?: string
  firstTabPlaceId?: number
}): TrackerDisplayProps {
  const name = options?.firstTabName ?? DEFAULT_FIRST_TAB_NAME
  const placeId = options?.firstTabPlaceId ?? DEFAULT_FIRST_TAB_PLACE_ID
  return {
    tabs: [{ id: 'overview_tab', name, placeId }],
    sections: [],
    grids: [],
    fields: [],
    layoutNodes: [],
    bindings: {},
    styles: undefined,
    dependsOn: [],
  }
}

/**
 * Pre-built empty schema (single Overview tab). Prefer createEmptyTrackerSchema()
 * when you need custom tab name or placeId.
 */
export const INITIAL_TRACKER_SCHEMA: TrackerDisplayProps =
  createEmptyTrackerSchema()
