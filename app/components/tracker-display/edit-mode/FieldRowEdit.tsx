'use client'

import { BlockWrapper } from './BlockWrapper'
import type { FieldRowEditProps } from './types'

/**
 * Edit wrapper for a div grid field row in edit mode.
 * Shows drag handle + delete on hover (scoped to this field only).
 */
export function FieldRowEdit({
  fieldId,
  label,
  onRemove,
  children,
  sortable,
}: FieldRowEditProps) {
  return (
    <BlockWrapper
      blockId={fieldId}
      variant="field"
      label={label}
      onRemove={onRemove}
      wrapperRef={sortable?.wrapperRef}
      wrapperStyle={sortable?.wrapperStyle}
      dragHandleProps={sortable?.dragHandleProps}
      isDragging={sortable?.isDragging}
    >
      <div className="space-y-1.5">
        {children}
      </div>
    </BlockWrapper>
  )
}
