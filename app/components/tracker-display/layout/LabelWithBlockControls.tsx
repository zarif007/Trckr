'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { GripVertical, Trash2, Plus, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LabelWithBlockControlsProps {
  /** The label content (text, InlineEditableName, etc.) */
  label: ReactNode
  onRemove: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  onAddBlockClick?: () => void
  onSettings?: () => void
  isSortable?: boolean
  /** Optional class for the outer wrapper */
  className?: string
}

/**
 * Inline label row that reveals drag/add/delete controls on hover.
 * When hidden, controls take zero space (no gap) so layout matches non-edit mode.
 */
export function LabelWithBlockControls({
  label,
  onRemove,
  dragHandleProps = {},
  onAddBlockClick,
  onSettings,
  isSortable = true,
  className,
}: LabelWithBlockControlsProps) {
  const [hovered, setHovered] = useState(false)

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])

  const showControls = hovered

  return (
    <div
      className={cn(
        'flex items-center min-w-0 group',
        showControls || isSortable ? 'gap-1.5' : '!gap-0',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-0.5 shrink-0 min-w-0">
        {/* Drag handle: always visible when sortable (reduced opacity when not hovered) so it's discoverable and focusable for keyboard. */}
        {isSortable && (
          <button
            type="button"
            className={cn(
              'flex items-center justify-center h-6 w-6 rounded shrink-0 transition-[color,opacity,transform] duration-200 ease-out',
              'hover:bg-muted hover:scale-110 text-muted-foreground/50 hover:text-foreground',
              'cursor-grab active:cursor-grabbing active:scale-95',
              showControls ? 'opacity-100' : 'opacity-50'
            )}
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
        {/* Add + Remove: only visible on hover to avoid clutter. */}
        <div
          className={cn(
            'flex items-center gap-0.5 overflow-hidden transition-[width,opacity,transform] duration-200 ease-out',
            showControls ? 'w-auto opacity-100 scale-100' : 'w-0 opacity-0 scale-95 pointer-events-none'
          )}
        >
          {onAddBlockClick && (
            <button
              type="button"
              className="flex items-center justify-center h-6 w-6 rounded shrink-0 transition-[color,transform] duration-200 ease-out hover:scale-110 hover:bg-muted text-muted-foreground/50 hover:text-foreground active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                onAddBlockClick()
              }}
              aria-label="Add block below"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          {onSettings && (
            <button
              type="button"
              className="flex items-center justify-center h-6 w-6 rounded shrink-0 transition-[color,transform] duration-200 ease-out hover:scale-110 hover:bg-muted text-muted-foreground/50 hover:text-foreground active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                onSettings()
              }}
              aria-label="Field settings"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          <button
            type="button"
            className="flex items-center justify-center h-6 w-6 rounded shrink-0 transition-[color,transform] duration-200 ease-out hover:scale-110 hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive active:scale-95"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {label}
      </div>
    </div>
  )
}
