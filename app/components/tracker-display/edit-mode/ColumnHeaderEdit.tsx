'use client'

import { BlockWrapper } from './BlockWrapper'
import type { ColumnHeaderEditProps } from './types'

/**
 * Edit controls for a table column header in edit mode.
 * Shows drag handle + delete on hover (scoped to this column only).
 */
export function ColumnHeaderEdit({
  fieldId,
  label,
  onRemove,
  sortable,
}: ColumnHeaderEditProps) {
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
      <span className="truncate font-medium text-foreground">{label}</span>
    </BlockWrapper>
  )
}
