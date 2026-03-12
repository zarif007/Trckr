/**
 * Tracker Edit Mode — flat Notion-like block editor for tracker layout editing.
 *
 * Use EditModeProvider at the tracker root when editMode is on.
 * BlockEditor renders the flat block list for a tab.
 * Grids use useLayoutActions() internally for field-level editing.
 */

export { EditModeProvider, useEditMode, useCanEditLayout } from './context'
export {
  useUndoableSchemaChange,
  EditModeUndoButton,
  useUndoKeyboardShortcut,
} from './undo'
export type {
  UseUndoableSchemaChangeOptions,
  UseUndoableSchemaChangeResult,
  EditModeUndoButtonProps,
} from './undo'
export type { EditModeContextValue, EditModeProviderProps } from './context'

export { BlockEditor } from './block-editor'
export { useLayoutActions } from './useLayoutActions'
export { useSectionGridActions } from './useSectionGridActions'

export { AddColumnOrFieldDialog, BlockCommandInput, BlockWrapper, ColumnHeaderEdit, FieldRowEdit } from './block-editor'
export type { BlockCommandInputProps, BlockCommandItem } from './block-editor'
export { FieldSettingsDialog } from './field-settings'
export {
  SortableColumnHeaderEdit,
  SortableFieldRowEdit,
  fieldSortableId,
  parseFieldId,
} from './block-editor'

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

export type { AvailableField } from './expr'
