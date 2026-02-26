'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FlowBuilderLayoutProps {
  /** Short instruction text (e.g. "Drag nodes from the palette, connect them, then click Apply.") */
  headerText: string
  /** Optional right side of header (e.g. Delete selected button) */
  headerRight?: ReactNode
  /** Left sidebar: palette of draggable nodes. Keep minimal (labels or compact list). */
  palette: ReactNode
  /** Main canvas area. Will be wrapped in an expandable container. */
  children: ReactNode
  /** Minimum height of the canvas (default 360px). Use larger for expandable view. */
  canvasMinHeight?: string
  /** Optional error message shown above Apply button */
  applyError?: string | null
  /** Called when user clicks Apply */
  onApply: () => void
  /** Label for the Apply button (default "Apply") */
  applyLabel?: string
  /** Optional class for the canvas wrapper */
  canvasClassName?: string
  /** Optional class for the palette wrapper (e.g. narrow width) */
  paletteClassName?: string
}

/**
 * Reusable layout for flow builders (expression builder, dynamic options pipeline).
 * Matches the pattern used by field-validation / field-calculation editors:
 * header row, minimal left palette, expandable canvas, apply error + Apply button.
 */
export function FlowBuilderLayout({
  headerText,
  headerRight,
  palette,
  children,
  canvasMinHeight = '360px',
  applyError,
  onApply,
  applyLabel = 'Apply',
  canvasClassName,
  paletteClassName,
}: FlowBuilderLayoutProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{headerText}</span>
        {headerRight}
      </div>
      <div className="flex gap-3 min-h-0 flex-1">
        <div
          className={cn(
            'shrink-0 flex flex-col gap-2 overflow-y-auto',
            paletteClassName ?? 'w-[140px]'
          )}
        >
          {palette}
        </div>
        <div
          className={cn(
            'flex-1 min-h-0 min-w-0 rounded-xl border border-border/60 bg-muted/20 p-2 flex flex-col',
            canvasClassName
          )}
          style={{ minHeight: canvasMinHeight }}
        >
          {children}
        </div>
      </div>
      {applyError != null && applyError !== '' && (
        <p className="text-xs text-destructive">{applyError}</p>
      )}
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="secondary" onClick={onApply}>
          {applyLabel}
        </Button>
      </div>
    </div>
  )
}
