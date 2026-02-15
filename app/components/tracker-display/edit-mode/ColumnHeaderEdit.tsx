'use client'

import { BlockWrapper } from './BlockWrapper'
import type { ColumnHeaderEditProps } from './types'

/**
 * Edit controls for a table column header in edit mode.
 * Notion-like: drag handle + delete on hover; reorder by drag.
 */
export function ColumnHeaderEdit({
  fieldId,
  label,
  onRemove,
  sortable,
}: ColumnHeaderEditProps) {
  const content = <span className="truncate font-medium text-foreground">{label}</span>

  if (sortable) {
    return (
      <BlockWrapper
        blockId={fieldId}
        variant="field"
        label={label}
        onRemove={onRemove}
        wrapperRef={sortable.wrapperRef}
        wrapperStyle={sortable.wrapperStyle}
        dragHandleProps={sortable.dragHandleProps}
        isDragging={sortable.isDragging}
      >
        {content}
      </BlockWrapper>
    )
  }

  return (
    <BlockWrapper blockId={fieldId} variant="field" label={label} onRemove={onRemove}>
      {content}
    </BlockWrapper>
  )
}
