'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

/** Viewport-space rectangle for the rubber-band (client coordinates). */
export type MarqueeViewportRect = {
  left: number
  top: number
  width: number
  height: number
}

const MIN_DRAG_PX = 4
/** Hit-testing uses at least 1×1px so horizontal-only / vertical-only drags still intersect tiles. */
const MIN_MARQUEE_HIT_PX = 1

const SELECTABLE = '[data-marquee-selectable]'
const SELECTABLE_WITH_ID = '[data-marquee-selectable][data-marquee-id]'
const IGNORE = '[data-marquee-ignore]'

/** Blocks starting a marquee when the event target is inside these (unless inside a selectable tile). */
const INTERACTIVE_OUTSIDE_SELECTABLE =
  'button, a[href], input, textarea, select, [role="dialog"], [role="menu"], [role="menuitem"]'

export function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; width: number; height: number },
): boolean {
  const bRight = b.left + b.width
  const bBottom = b.top + b.height
  return !(
    a.right < b.left ||
    a.left > bRight ||
    a.bottom < b.top ||
    a.top > bBottom
  )
}

function normalizeViewportRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): MarqueeViewportRect {
  const left = Math.min(x0, x1)
  const top = Math.min(y0, y1)
  return {
    left,
    top,
    width: Math.max(0, Math.abs(x1 - x0)),
    height: Math.max(0, Math.abs(y1 - y0)),
  }
}

function collectHits(
  root: HTMLElement,
  marquee: MarqueeViewportRect,
): Set<string> {
  const hits = new Set<string>()
  const effective: MarqueeViewportRect = {
    left: marquee.left,
    top: marquee.top,
    width: Math.max(marquee.width, MIN_MARQUEE_HIT_PX),
    height: Math.max(marquee.height, MIN_MARQUEE_HIT_PX),
  }
  const nodes = root.querySelectorAll(SELECTABLE_WITH_ID)
  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue
    const id = el.getAttribute('data-marquee-id')
    if (!id) continue
    const r = el.getBoundingClientRect()
    if (rectsIntersect(r, effective)) hits.add(id)
  }
  return hits
}

export type MarqueeSelectionRootProps = {
  ref: React.RefObject<HTMLDivElement | null>
  onPointerDownCapture: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void
  role: 'listbox'
  'aria-multiselectable': true
}

export type UseMarqueeSelectionResult = {
  /** Spread onto the `relative` container that wraps selectable tiles. */
  rootProps: MarqueeSelectionRootProps
  selectedIds: ReadonlySet<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  clearSelection: () => void
  isDragging: boolean
  /** Viewport-space rect while dragging; pass to `MarqueeSelectionOverlay`. */
  dragRect: MarqueeViewportRect | null
}

/**
 * Desktop-style marquee (rubber-band) multi-select inside a single root element.
 *
 * **Markup:** Mark each selectable tile with `data-marquee-selectable` and
 * `data-marquee-id="<unique string>"`. Use `data-marquee-ignore` on controls that
 * sit inside the root but must not start a drag (e.g. “New project” tiles).
 *
 * **Starting a drag:** `pointerdown` on the root only starts a marquee if the target
 * is not inside `[data-marquee-selectable]`, `[data-marquee-ignore]`, or common
 * interactive chrome (`button`, `a[href]`, inputs, dialogs/menus). Uses
 * `setPointerCapture` so the band tracks the pointer outside the root.
 *
 * **Coordinates:** Rectangles use viewport (`clientX` / `clientY` and
 * `getBoundingClientRect()`), so scrolling inside `overflow: auto` ancestors still
 * intersects correctly. Purely horizontal or vertical bands are expanded to at least
 * 1×1px for intersection so row-wide drags still select tiles.
 *
 * **After `pointerup`:** If the pointer moved at least {@link MIN_DRAG_PX}px,
 * items whose bounds intersect the band are selected. Modifier keys on **pointerup**:
 * - **Shift:** union with the previous selection.
 * - **Otherwise (no Shift):** replace the selection with the hit set (includes Meta/Ctrl per product spec).
 *
 * **Click on empty space** (no meaningful drag): clears the selection.
 *
 * **Escape:** Clears the selection while `selectedIds` is non-empty.
 *
 * Touch: pointer events fire on many touch browsers; small drags are ignored via the
 * minimum distance threshold.
 */
export function useMarqueeSelection(): UseMarqueeSelectionResult {
  const rootRef = useRef<HTMLDivElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragRect, setDragRect] = useState<MarqueeViewportRect | null>(null)

  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    maxDelta: number
  } | null>(null)

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  useEffect(() => {
    if (selectedIds.size === 0) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        clearSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedIds.size, clearSelection])

  const handlePointerDownCapture = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !rootRef.current) return
      const target = e.target
      if (!(target instanceof Element)) return

      if (target.closest(IGNORE)) return
      if (target.closest(SELECTABLE)) return
      if (target.closest(INTERACTIVE_OUTSIDE_SELECTABLE)) return

      const root = rootRef.current
      if (!root.contains(target)) return

      e.preventDefault()
      root.setPointerCapture(e.pointerId)
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        maxDelta: 0,
      }
      setIsDragging(true)
      setDragRect(
        normalizeViewportRect(e.clientX, e.clientY, e.clientX, e.clientY),
      )
    },
    [],
  )

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    d.maxDelta = Math.max(d.maxDelta, Math.hypot(dx, dy))
    setDragRect(normalizeViewportRect(d.startX, d.startY, e.clientX, e.clientY))
  }, [])

  const finishPointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const finalDelta = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
      const maxDelta = Math.max(d.maxDelta, finalDelta)
      const root = rootRef.current
      dragRef.current = null
      try {
        root?.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      setIsDragging(false)
      setDragRect(null)

      const committed = maxDelta >= MIN_DRAG_PX
      if (!root) return

      if (!committed) {
        clearSelection()
        return
      }

      const marquee = normalizeViewportRect(
        d.startX,
        d.startY,
        e.clientX,
        e.clientY,
      )
      const hits = collectHits(root, marquee)
      setSelectedIds((prev) => {
        if (e.shiftKey) {
          const next = new Set(prev)
          for (const id of hits) next.add(id)
          return next
        }
        return hits
      })
    },
    [clearSelection],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      finishPointer(e)
    },
    [finishPointer],
  )

  const handlePointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      dragRef.current = null
      try {
        rootRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
      setIsDragging(false)
      setDragRect(null)
    },
    [],
  )

  const rootProps: MarqueeSelectionRootProps = {
    ref: rootRef,
    onPointerDownCapture: handlePointerDownCapture,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    role: 'listbox',
    'aria-multiselectable': true,
  }

  return {
    rootProps,
    selectedIds,
    setSelectedIds,
    clearSelection,
    isDragging,
    dragRect,
  }
}
