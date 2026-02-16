'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { GripVertical, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LabelWithBlockControlsProps {
  /** The label content (text, InlineEditableName, etc.) */
  label: ReactNode
  onRemove: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  onAddBlockClick?: () => void
  isSortable?: boolean
  /** Optional class for the outer wrapper */
  className?: string
}

/**
 * Inline label row that reveals drag/add/delete controls on hover.
 * The label shifts right when controls appear, saving space and improving discoverability.
 */
export function LabelWithBlockControls({
  label,
  onRemove,
  dragHandleProps = {},
  onAddBlockClick,
  isSortable = true,
  className,
}: LabelWithBlockControlsProps) {
  const [hovered, setHovered] = useState(false)

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])

  const showControls = hovered

  return (
    <div
      className={cn('flex items-center gap-1.5 min-w-0 group', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Controls: appear on hover, push label right */}
      <div
        className={cn(
          'flex items-center gap-0.5 shrink-0 overflow-hidden transition-[width,opacity] duration-150',
          showControls ? 'w-[4.5rem] opacity-100' : 'w-0 opacity-0 pointer-events-none'
        )}
      >
        <button
          type="button"
          className={cn(
            'flex items-center justify-center h-6 w-6 rounded shrink-0 transition-colors',
            'hover:bg-muted text-muted-foreground/50 hover:text-foreground',
            'cursor-grab active:cursor-grabbing'
          )}
          aria-label="Drag to reorder"
          {...(isSortable ? dragHandleProps : {})}
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
        </button>
        {onAddBlockClick && (
          <button
            type="button"
            className="flex items-center justify-center h-6 w-6 rounded shrink-0 transition-colors hover:bg-muted text-muted-foreground/50 hover:text-foreground"
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
          className="flex items-center justify-center h-6 w-6 rounded shrink-0 transition-colors hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {/* Label: flex-1 so it naturally shrinks when controls appear */}
      <div className="flex-1 min-w-0">
        {label}
      </div>
    </div>
  )
}
