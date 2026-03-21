'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type LandingAxisFrameProps = {
  children: React.ReactNode
  id?: string
  /** Outer wrapper (layout only; inset matches `extend` so rules are not clipped). */
  className?: string
  /** Inner panel: padding, background, transitions — no box border needed; frame is the axis lines. */
  contentClassName?: string
  /**
   * Extra classes on axis lines (e.g. opacity). Color defaults to `hsl(var(--border))` inline so
   * it matches CSS `border-color: hsl(var(--border))` exactly (avoids bg-border vs border-border mismatch).
   */
  lineClassName?: string
  /**
   * How far each rule runs past the opposite edges (blueprint / drafting overlap).
   * Top & bottom lines extend horizontally by 2× this; left & right extend vertically.
   */
  extend?: number
}

export default function LandingAxisFrame({
  children,
  id,
  className,
  contentClassName,
  lineClassName,
  extend = 18,
}: LandingAxisFrameProps) {
  const ext = extend
  const line = cn(
    'pointer-events-none absolute z-0 [transform:translateZ(0)] [backface-visibility:hidden]',
    lineClassName,
  )

  const linePaint =
    lineClassName?.match(/\bbg-/) != null
      ? undefined
      : ({ backgroundColor: 'hsl(var(--border))' } as const)

  const horiz = (pos: 'top' | 'bottom'): CSSProperties => ({
    ...(pos === 'top' ? { top: 0 } : { bottom: 0 }),
    left: -ext,
    height: 1,
    width: `calc(100% + ${2 * ext}px)`,
    ...(linePaint ?? {}),
  })

  const vert = (side: 'left' | 'right'): CSSProperties => ({
    [side]: 0,
    top: -ext,
    width: 1,
    height: `calc(100% + ${2 * ext}px)`,
    ...(linePaint ?? {}),
  })

  return (
    <div
      id={id}
      className={cn('relative', className)}
      style={{ padding: ext }}
    >
      <div className="relative">
        <span aria-hidden className={line} style={horiz('top')} />
        <span aria-hidden className={line} style={horiz('bottom')} />
        <span aria-hidden className={line} style={vert('left')} />
        <span aria-hidden className={line} style={vert('right')} />

        <div className={cn('relative z-10 rounded-none', contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
