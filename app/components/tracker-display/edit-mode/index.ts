/**
 * Tracker Edit Mode — flat Notion-like block editor for tracker layout editing.
 *
 * Use EditModeProvider at the tracker root when editMode is on.
 * BlockEditor renders the flat block list for a tab.
 * Grids use useLayoutActions() internally for field-level editing.
 */

export { EditModeProvider, useEditMode, useCanEditLayout } from './context'
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
export {
  SortableColumnHeaderEdit,
  SortableFieldRowEdit,
  fieldSortableId,
  parseFieldId,
} from './SortableBlock'

export {
  createNewFieldId,
  createNewField,
  getNextLayoutOrder,
  getSimpleFieldTypes,
  SIMPLE_FIELD_TYPES,
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
