'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * View-mode block shell: same structure as edit-mode BlockWrapper
 * (no left gutter; edit controls are inline with labels).
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
        'relative flex flex-col w-full min-w-0',
        variant === 'section' && 'mt-0',
        variant === 'grid' && 'rounded-md',
        className
      )}
    >
      {children}
    </div>
  )
}
