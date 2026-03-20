'use client'

import { cn } from '@/lib/utils'

type LandingAxisFrameProps = {
  children: React.ReactNode
  id?: string
  /** Outer wrapper (layout only; inset matches `extend` so rules are not clipped). */
  className?: string
  /** Inner panel: padding, background, transitions — no box border needed; frame is the axis lines. */
  contentClassName?: string
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
  extend = 18,
}: LandingAxisFrameProps) {
  const ext = extend
  const line = 'pointer-events-none absolute z-0 bg-border'

  return (
    <div
      id={id}
      className={cn('relative', className)}
      style={{ padding: ext }}
    >
      <div className="relative">
        <span
          aria-hidden
          className={line}
          style={{
            top: 0,
            left: -ext,
            height: 1,
            width: `calc(100% + ${2 * ext}px)`,
          }}
        />
        <span
          aria-hidden
          className={line}
          style={{
            bottom: 0,
            left: -ext,
            height: 1,
            width: `calc(100% + ${2 * ext}px)`,
          }}
        />
        <span
          aria-hidden
          className={line}
          style={{
            left: 0,
            top: -ext,
            width: 1,
            height: `calc(100% + ${2 * ext}px)`,
          }}
        />
        <span
          aria-hidden
          className={line}
          style={{
            right: 0,
            top: -ext,
            width: 1,
            height: `calc(100% + ${2 * ext}px)`,
          }}
        />

        <div className={cn('relative z-10 rounded-none', contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
