'use client'

import { BlockWrapper } from './BlockWrapper'
import { useBlockControls, LabelWithBlockControls } from '../layout'
import type { FieldRowEditProps } from './types'

/**
 * Edit wrapper for a div grid field row in edit mode.
 * Inline controls (drag, delete) appear on hover of the label row.
 */
function FieldRowContent({
  labelContent,
  children,
}: {
  labelContent: React.ReactNode
  children: React.ReactNode
}) {
  const controls = useBlockControls()
  if (!controls) {
    return (
      <div className="space-y-1.5">
        {labelContent}
        {children}
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <LabelWithBlockControls
        label={labelContent}
        onRemove={controls.onRemove}
        dragHandleProps={controls.dragHandleProps}
        isSortable={controls.isSortable}
      />
      {children}
    </div>
  )
}

export function FieldRowEdit({
  fieldId,
  label,
  labelContent,
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
      <FieldRowContent labelContent={labelContent ?? label}>
        {children}
      </FieldRowContent>
    </BlockWrapper>
  )
}
