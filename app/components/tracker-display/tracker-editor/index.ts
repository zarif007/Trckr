/**
 * Tracker editor — building blocks for create and update tracker flows.
 * Used by from-scratch page and any future full-page or dialog-based editors
 * that need empty schema, editable state, or a consistent page layout.
 */

export {
  createEmptyTrackerSchema,
  INITIAL_TRACKER_SCHEMA,
  DEFAULT_FIRST_TAB_NAME,
  DEFAULT_FIRST_TAB_PLACE_ID,
} from './constants'

export { useEditableTrackerSchema } from './useEditableTrackerSchema'

export { TrackerEditorPageLayout } from './TrackerEditorPageLayout'
export type { TrackerEditorPageLayoutProps } from './TrackerEditorPageLayout'
