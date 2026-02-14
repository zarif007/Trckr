/**
 * Tracker Display — public API for rendering tracker schemas.
 *
 * @module tracker-display
 */

/** Renders a tracker with tabs, sections, and grid views (table, kanban, form). */
export { TrackerDisplayInline as TrackerDisplay } from './TrackerDisplayInline'

/** Standalone table for displaying depends-on rules (e.g. in an admin or rules-editor view). */
export { DependsOnTable } from './DependsOnTable'

export type {
    TrackerDisplayProps,
    TrackerTab,
    TrackerSection,
    TrackerGrid,
    TrackerField,
    TrackerLayoutNode,
    TrackerBindings,
    StyleOverrides,
    DependsOnRules,
} from './types'
