/**
 * Tracker Display — public API for rendering tracker schemas.
 *
 * @module tracker-display
 */

/** Renders a tracker with tabs, sections, and grid views (table, kanban, form). */
export { TrackerDisplayInline as TrackerDisplay } from './TrackerDisplayInline'

/** Standalone table for displaying depends-on rules (e.g. in an admin or rules-editor view). */
export { DependsOnTable } from './DependsOnTable'

/** Table for viewing and editing select/multiselect field bindings (options grid, label field, mappings). */
export { BindingsTable } from './BindingsTable'

/** Reusable layout primitives (tokens, SectionBar, ViewBlockWrapper, InlineEditableName). */
export {
  SectionBar,
  ViewBlockWrapper,
  InlineEditableName,
  SECTION_BAR_CLASS,
  SECTION_STACK_GAP,
  GRIDS_CONTAINER,
  SECTION_GROUP_ROOT,
  TAB_CONTENT_ROOT,
  TAB_CONTENT_INNER,
} from './layout'

/** Reusable block-level UI (GridBlockHeader, GridBlockContent, GridTypeBadge). */
export { GridBlockHeader, GridBlockContent, GridTypeBadge } from './blocks'

export type {
  TrackerDisplayProps,
  TrackerTab,
  TrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  FieldValidationRule,
  StyleOverrides,
  DependsOnRules,
} from './types'
export type { SectionBarProps, InlineEditableNameProps } from './layout'
export type { GridBlockHeaderProps, GridBlockContentProps } from './blocks'
