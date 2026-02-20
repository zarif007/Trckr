/**
 * Tracker Edit Mode — flat Notion-like block editor for tracker layout editing.
 *
 * Use EditModeProvider at the tracker root when editMode is on.
 * BlockEditor renders the flat block list for a tab.
 * Grids use useLayoutActions() internally for field-level editing.
 */

export { EditModeProvider, useEditMode, useCanEditLayout } from './context'
export { useUndoableSchemaChange } from './useUndoableSchemaChange'
export type { UseUndoableSchemaChangeOptions, UseUndoableSchemaChangeResult } from './useUndoableSchemaChange'
export { EditModeUndoButton, useUndoKeyboardShortcut } from './undo'
export type { EditModeUndoButtonProps } from './undo'
export type { EditModeContextValue, EditModeProviderProps } from './context'

export { BlockEditor } from './BlockEditor'
export { useLayoutActions } from './useLayoutActions'
export { useSectionGridActions } from './useSectionGridActions'

export { AddColumnOrFieldDialog } from './AddColumnOrFieldDialog'
export { BlockCommandInput } from './BlockCommandInput'
export type {
  BlockCommandInputProps,
  BlockCommandItem,
} from './BlockCommandInput'
export { BlockWrapper } from './BlockWrapper'
export { ColumnHeaderEdit } from './ColumnHeaderEdit'
export { FieldRowEdit } from './FieldRowEdit'
export { FieldSettingsDialog } from './FieldSettingsDialog'
export {
  SortableColumnHeaderEdit,
  SortableFieldRowEdit,
  fieldSortableId,
  parseFieldId,
} from './SortableBlock'

export { getOrCreateSectionAndGridForField } from './ensureContainer'
export type { EnsureContainerResult } from './ensureContainer'

export {
  createNewFieldId,
  createNewField,
  getNextLayoutOrder,
  getSimpleFieldTypes,
  SIMPLE_FIELD_TYPES,
  createNewTabId,
  getNextTabPlaceId,
  createNewSectionId,
  createNewGridId,
  getNextSectionPlaceId,
  getNextGridPlaceId,
} from './utils'

export type {
  FlatBlock,
  BlockEditorProps,
  AddColumnOrFieldResult,
  AddColumnOrFieldDialogProps,
  AddTargetVariant,
  ColumnHeaderEditProps,
  FieldRowEditProps,
  EditModeSchema,
  BlockVariant,
  BlockWrapperProps,
} from './types'
