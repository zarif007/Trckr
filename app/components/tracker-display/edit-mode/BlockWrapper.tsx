'use client'

import { useState, useCallback } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import type { BlockWrapperProps } from './types'
import { cn } from '@/lib/utils'

/**
 * Notion-like block chrome: left gutter with drag handle and delete, visible on hover.
 *
 * Uses JS onMouseOver/onMouseOut with stopPropagation so only the DIRECTLY
 * hovered block shows its gutter -- not parent blocks when a child is hovered.
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
  const [hovered, setHovered] = useState(false)
  const isSortable = Boolean(dragHandleProps)

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setHovered(true)
  }, [])

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setHovered(false)
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={wrapperStyle}
      data-block-id={blockId}
      data-block-variant={variant}
      className={cn(
        'relative flex items-start',
        variant === 'section' && 'mt-1',
        variant === 'grid' && 'rounded-md',
        isDragging && 'opacity-40',
      )}
      aria-label={label}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      {/* Left gutter: drag handle + delete, visible on hover */}
      <div
        className={cn(
          'flex items-center gap-0 shrink-0 h-7 -ml-[40px] mr-1 transition-opacity duration-100',
          hovered && !isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <button
          ref={dragHandleRef}
          type="button"
          className="flex items-center justify-center h-5 w-5 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
          aria-label={`Drag to reorder ${label}`}
          {...(isSortable ? dragHandleProps : {})}
        >
          <GripVertical className="h-3 w-3" aria-hidden />
        </button>
        <button
          type="button"
          className="flex items-center justify-center h-5 w-5 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove ${label}`}
        >
          <Trash2 className="h-2.5 w-2.5" aria-hidden />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
