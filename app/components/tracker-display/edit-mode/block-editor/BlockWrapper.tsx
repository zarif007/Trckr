'use client'

import type { BlockWrapperProps } from '../types'
import { BlockControlsProvider } from '../../layout/block-controls-context'
import { cn } from '@/lib/utils'

/**
 * Block wrapper for sections, grids, and fields in edit mode.
 * Provides BlockControlsContext so SectionBar, GridBlockHeader, and field labels
 * can render inline controls (drag, add, delete) on hover — no left gutter.
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
  dragHandleProps = {},
  onAddBlockClick,
}: BlockWrapperProps) {
  const isSortable = Boolean(dragHandleProps && Object.keys(dragHandleProps).length > 0)

  const controlsValue = {
    dragHandleProps,
    onRemove,
    onAddBlockClick,
    isSortable,
    label,
  }

  return (
    <BlockControlsProvider value={controlsValue}>
      <div
        ref={wrapperRef}
        style={wrapperStyle}
        data-block-id={blockId}
        data-block-variant={variant}
        className={cn(
          'relative flex flex-col w-full min-w-0',
          variant === 'section' && 'mt-0',
          variant === 'grid' && 'rounded-md',
          isDragging && 'opacity-40',
        )}
        aria-label={label}
      >
        {children}
      </div>
    </BlockControlsProvider>
  )
}
