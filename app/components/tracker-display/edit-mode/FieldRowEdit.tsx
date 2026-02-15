'use client'

import { BlockWrapper } from './BlockWrapper'
import type { FieldRowEditProps } from './types'

/**
 * Edit wrapper for a div grid field row in edit mode.
 * Notion-like: drag handle + delete on hover; reorder by drag.
 */
export function FieldRowEdit({
  fieldId,
  label,
  onRemove,
  children,
  sortable,
}: FieldRowEditProps) {
  const content = (
    <div className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="space-y-1.5">{children}</div>
    </div>
  )

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
