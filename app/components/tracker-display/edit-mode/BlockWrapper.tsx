'use client'

import { GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BlockWrapperProps } from './types'

/**
 * Notion-like block chrome: left gutter with drag handle and delete, visible on hover.
 * Used by the flat BlockEditor and by field-level sortables within grids.
 */
export function BlockWrapper({
  blockId,
  variant,
  children,
  onRemove,
  label,
  isDragging = false,
  wrapperRef,
  wrapperStyle,
  dragHandleProps,
  dragHandleRef,
}: BlockWrapperProps) {
  const isSortable = Boolean(dragHandleProps)

  return (
    <div
      ref={wrapperRef}
      style={wrapperStyle}
      data-block-id={blockId}
      data-block-variant={variant}
      className="group/block relative flex items-start gap-0 rounded-md transition-colors min-h-[2rem]"
      aria-label={label}
    >
      {/* Left gutter: drag handle + delete, visible on hover */}
      <div className="flex flex-col items-center gap-0.5 pt-1 pl-0.5 pr-1 shrink-0 opacity-0 group-hover/block:opacity-100 transition-opacity">
        <Button
          ref={dragHandleRef}
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label={`Drag to reorder ${label}`}
          {...(isSortable ? dragHandleProps : {})}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove ${label}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
      {/* Content */}
      <div
        className={`flex-1 min-w-0 py-1 pr-2 ${isDragging ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}
