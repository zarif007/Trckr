'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MarqueeViewportRect } from '@/app/dashboard/hooks/useMarqueeSelection'

type MarqueeSelectionOverlayProps = {
  rect: MarqueeViewportRect
  className?: string
}

/**
 * Renders the rubber-band rectangle in **viewport** space via `position: fixed`.
 * Uses a portal so parent `overflow` / transforms (e.g. Framer Motion) do not clip it.
 */
export function MarqueeSelectionOverlay({
  rect,
  className,
}: MarqueeSelectionOverlayProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || typeof document === 'undefined') return null

  const node = (
    <div
      aria-hidden
      className={
        className ??
        'pointer-events-none fixed z-[200] rounded-sm border border-dashed border-primary/55 bg-primary/[0.08] shadow-sm'
      }
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  )

  return createPortal(node, document.body)
}
