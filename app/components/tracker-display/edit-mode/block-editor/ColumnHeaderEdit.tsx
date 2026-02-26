'use client'

import { GripVertical, Trash2, Settings2 } from 'lucide-react'
import { BlockWrapper } from './BlockWrapper'
import type { ColumnHeaderEditProps } from '../types'
import { cn } from '@/lib/utils'

/**
 * Edit controls for a table column header in edit mode.
 * Shows drag handle + delete on hover (scoped to this column only).
 * When inline, renders inside the cell so header aligns with table body.
 */
export function ColumnHeaderEdit({
  fieldId,
  label,
  onRemove,
  onSettings,
  sortable,
  inline = false,
}: ColumnHeaderEditProps) {
  const isSortable = Boolean(sortable?.dragHandleProps)
  const content = (
    <>
      <button
        type="button"
        className={cn(
          'flex items-center justify-center shrink-0 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors',
          inline ? 'h-6 w-6 p-0' : 'h-6 w-6'
        )}
        aria-label={`Drag to reorder ${label}`}
        {...(isSortable ? sortable!.dragHandleProps : {})}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span className="truncate font-medium text-foreground">{label}</span>
      {onSettings && (
        <button
          type="button"
          className={cn(
            'flex items-center justify-center shrink-0 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors',
            inline ? 'h-6 w-6 p-0' : 'h-6 w-6'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSettings()
          }}
          aria-label={`Field settings for ${label}`}
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
      <button
        type="button"
        className={cn(
          'flex items-center justify-center shrink-0 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors',
          inline ? 'h-6 w-6 p-0' : 'h-6 w-6'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        aria-label={`Remove ${label}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </>
  )

  if (inline) {
    return (
      <div
        ref={sortable?.wrapperRef}
        style={sortable?.wrapperStyle}
        data-block-id={fieldId}
        className={cn(
          'flex items-center gap-1.5 min-w-0 w-full',
          sortable?.isDragging && 'opacity-40'
        )}
      >
        {content}
      </div>
    )
  }

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
