'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ColumnHeaderEdit } from './ColumnHeaderEdit'
import { FieldRowEdit } from './FieldRowEdit'

const FIELD_PREFIX = 'field-'
/** Delimiter safe for gridId/fieldId that may contain dashes. */
const FIELD_ID_DELIMITER = '::'

export function fieldSortableId(gridId: string, fieldId: string): string {
  return `${FIELD_PREFIX}${gridId}${FIELD_ID_DELIMITER}${fieldId}`
}

export function parseFieldId(sortableId: string): { gridId: string; fieldId: string } | null {
  if (!sortableId.startsWith(FIELD_PREFIX)) return null
  const rest = sortableId.slice(FIELD_PREFIX.length)
  const delim = rest.indexOf(FIELD_ID_DELIMITER)
  if (delim < 0) return null
  return {
    gridId: rest.slice(0, delim),
    fieldId: rest.slice(delim + FIELD_ID_DELIMITER.length),
  }
}

/** Sortable column header for table grid (pass sortable props to ColumnHeaderEdit). */
export interface SortableColumnHeaderEditProps {
  gridId: string
  fieldId: string
  label: string
  index: number
  totalColumns: number
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export function SortableColumnHeaderEdit({
  gridId,
  fieldId,
  label,
  index,
  totalColumns,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SortableColumnHeaderEditProps) {
  const id = fieldSortableId(gridId, fieldId)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <ColumnHeaderEdit
      fieldId={fieldId}
      label={label}
      index={index}
      totalColumns={totalColumns}
      onRemove={onRemove}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      inline
      sortable={{
        wrapperRef: setNodeRef,
        wrapperStyle: style,
        dragHandleProps: { ...attributes, ...listeners },
        isDragging,
      }}
    />
  )
}

/** Sortable field row for div grid (pass sortable props to FieldRowEdit). */
export interface SortableFieldRowEditProps {
  gridId: string
  fieldId: string
  label: string
  labelContent?: React.ReactNode
  index: number
  totalFields: number
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  children: React.ReactNode
}

export function SortableFieldRowEdit({
  gridId,
  fieldId,
  label,
  labelContent,
  index,
  totalFields,
  onRemove,
  onMoveUp,
  onMoveDown,
  children,
}: SortableFieldRowEditProps) {
  const id = fieldSortableId(gridId, fieldId)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <FieldRowEdit
      fieldId={fieldId}
      label={label}
      labelContent={labelContent}
      index={index}
      totalFields={totalFields}
      onRemove={onRemove}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      sortable={{
        wrapperRef: setNodeRef,
        wrapperStyle: style,
        dragHandleProps: { ...attributes, ...listeners },
        isDragging,
      }}
    >
      {children}
    </FieldRowEdit>
  )
}
