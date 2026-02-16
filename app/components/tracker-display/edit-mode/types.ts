/**
 * Edit mode module types.
 * Keeps edit-mode-specific types in one place for easy modification.
 */

import type { ReactNode } from 'react'
import type {
  TrackerField,
  TrackerLayoutNode,
  TrackerFieldType,
  TrackerTab,
  TrackerSection,
  TrackerGrid,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from '../types'

// ---------------------------------------------------------------------------
// Flat block editor types
// ---------------------------------------------------------------------------

/** A single item in the flat block list (section or grid). */
export type FlatBlock =
  | { type: 'section'; id: string }
  | { type: 'grid'; id: string; sectionId: string }

/** Props for the top-level BlockEditor component. */
export interface BlockEditorProps {
  tab: TrackerTab
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  styles?: Record<string, StyleOverrides>
  dependsOn?: DependsOnRules
  gridData: Record<string, Array<Record<string, unknown>>>
  onUpdate: (gridId: string, rowIndex: number, columnId: string, value: unknown) => void
  /** When omitted (e.g. in edit/add layout mode), Add Entry and add-data buttons are hidden. */
  onAddEntry?: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries?: (gridId: string, rowIndices: number[]) => void
}

// ---------------------------------------------------------------------------
// Field-level editing types (used within grids)
// ---------------------------------------------------------------------------

/** Schema shape required for edit mode (subset of TrackerDisplayProps). */
export interface EditModeSchema {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings?: TrackerBindings
  styles?: Record<string, unknown>
  dependsOn?: DependsOnRules
}

/** Result of "Add column" or "Add field" dialog. */
export type AddColumnOrFieldResult =
  | { mode: 'new'; label: string; dataType: TrackerFieldType }
  | { mode: 'existing'; fieldId: string }

/** Variant for the add dialog: table column vs div field. */
export type AddTargetVariant = 'column' | 'field'

/** Props for the add column/field dialog. */
export interface AddColumnOrFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: AddTargetVariant
  existingFieldIds: string[]
  allFields: TrackerField[]
  onConfirm: (result: AddColumnOrFieldResult) => void
}

/** Props for the table column header edit controls. */
export interface ColumnHeaderEditProps {
  fieldId: string
  label: string
  index: number
  totalColumns: number
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  /** When true, render inline (no left gutter) so header aligns with table body. */
  inline?: boolean
  sortable?: {
    wrapperRef: (node: HTMLElement | null) => void
    wrapperStyle: React.CSSProperties
    dragHandleProps: React.HTMLAttributes<HTMLButtonElement>
    isDragging?: boolean
  }
}

/** Props for the div field row edit wrapper. */
export interface FieldRowEditProps {
  fieldId: string
  label: string
  index: number
  totalFields: number
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  children: ReactNode
  sortable?: {
    wrapperRef: (node: HTMLElement | null) => void
    wrapperStyle: React.CSSProperties
    dragHandleProps: React.HTMLAttributes<HTMLButtonElement>
    isDragging?: boolean
  }
}

/** Block variant for Notion-like edit UI. */
export type BlockVariant = 'section' | 'grid' | 'field'

/** Props for the block wrapper (hover handle + delete, optional sortable). */
export interface BlockWrapperProps {
  blockId: string
  variant: BlockVariant
  children: ReactNode
  onRemove: () => void
  /** Aria label for the block (e.g. section name). */
  label: string
  /** When true, block is being dragged (e.g. hide or dim content). */
  isDragging?: boolean
  /** Ref for the sortable wrapper (setNodeRef from useSortable). */
  wrapperRef?: (node: HTMLElement | null) => void
  /** Style for transform/transition when sortable (from useSortable). */
  wrapperStyle?: React.CSSProperties
  /** Props to attach to the drag handle (listeners + attributes from useSortable). */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  /** Ref for the drag handle if needed. */
  dragHandleRef?: React.RefObject<HTMLButtonElement | null>
  /** When provided, shows a plus button that opens the add-block inserter below this block. */
  onAddBlockClick?: () => void
}
