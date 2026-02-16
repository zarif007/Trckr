'use client'

import { useState, useCallback } from 'react'
import { GripVertical, Trash2, Plus } from 'lucide-react'
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
  onAddBlockClick,
}: BlockWrapperProps) {
  const [hovered, setHovered] = useState(false)
  const isSortable = Boolean(dragHandleProps)

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Don't show this block's gutter when the pointer is over a nested block (e.g. field row inside a grid).
    const wrapperEl = e.currentTarget
    const blockUnderMouse = (e.target as Element)?.closest?.('[data-block-id]')
    if (blockUnderMouse && blockUnderMouse !== wrapperEl && wrapperEl.contains(blockUnderMouse)) {
      setHovered(false)
      return
    }
    setHovered(true)
  }, [])

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Don't clear hover when the pointer moved to a nested block (let the nested block own the gutter).
    const wrapperEl = e.currentTarget
    const relatedBlock = (e.relatedTarget as Element)?.closest?.('[data-block-id]')
    if (relatedBlock && relatedBlock !== wrapperEl && wrapperEl.contains(relatedBlock)) {
      return
    }
    setHovered(false)
  }, [])

  // When moving inside this block, hide gutter if pointer is over a nested block (we don't get mouseOut when moving to a child).
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const wrapperEl = e.currentTarget
    const blockUnderMouse = (e.target as Element)?.closest?.('[data-block-id]')
    if (blockUnderMouse && blockUnderMouse !== wrapperEl && wrapperEl.contains(blockUnderMouse)) {
      setHovered(false)
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={wrapperStyle}
      data-block-id={blockId}
      data-block-variant={variant}
      className={cn(
        'relative flex items-start w-[calc(100%+2.5rem)] -ml-10',
        variant === 'section' && 'mt-0',
        variant === 'grid' && 'rounded-md',
        isDragging && 'opacity-40',
      )}
      aria-label={label}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onMouseMove={handleMouseMove}
    >
      {/* Left gutter: fixed-width column, buttons stacked vertically, visible on hover */}
      <div
        className={cn(
          'flex flex-col items-center gap-1 transition-opacity duration-100 shrink-0 w-10',
          hovered && !isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <button
          ref={dragHandleRef}
          type="button"
          className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
          aria-label={`Drag to reorder ${label}`}
          {...(isSortable ? dragHandleProps : {})}
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
        </button>
        {onAddBlockClick && (
          <button
            type="button"
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onAddBlockClick()
            }}
            aria-label="Add block below"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
        <button
          type="button"
          className="flex items-center justify-center h-6 w-6 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove ${label}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {/* Content — starts after gutter column; no extra right padding (match left) */}
      <div className="flex-1 min-w-0 w-full">
        {children}
      </div>
    </div>
  )
}
