'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * View-mode block shell: same structure and classes as edit-mode BlockWrapper
 * so section bar and grid blocks are pixel-identical. No gutter buttons.
 */
export function ViewBlockWrapper({
  variant,
  children,
  className,
}: {
  variant: 'section' | 'grid'
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex items-start w-[calc(100%+2.5rem)] -ml-10',
        variant === 'section' && 'mt-0',
        variant === 'grid' && 'rounded-md',
        className
      )}
    >
      {/* Gutter spacer: same width as edit BlockWrapper gutter so content aligns */}
      <div className="shrink-0 w-10" aria-hidden />
      {/* Content: same as BlockWrapper content wrapper */}
      <div className="flex-1 min-w-0 w-full">{children}</div>
    </div>
  )
}
