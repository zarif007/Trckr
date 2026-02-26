import type { DragMoveEvent, DragEndEvent } from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import { DROP_ZONE_PREFIX } from './constants'
import type { DropPlacement, RectLike } from './types'

export function fieldDropZoneId(gridId: string, fieldId: string, placement: DropPlacement) {
  return `${DROP_ZONE_PREFIX}::${gridId}::${fieldId}::${placement}`
}

export function parseDropZoneId(
  id: string
): { gridId: string; fieldId: string; placement: DropPlacement } | null {
  if (!id.startsWith(`${DROP_ZONE_PREFIX}::`)) return null
  const parts = id.split('::')
  if (parts.length !== 4) return null
  const [, gridId, fieldId, placement] = parts
  if (
    placement !== 'left' &&
    placement !== 'right' &&
    placement !== 'above' &&
    placement !== 'below'
  )
    return null
  return { gridId, fieldId, placement }
}

export function getPointerCoordinates(event: DragMoveEvent | DragEndEvent) {
  const coords = getEventCoordinates(event.activatorEvent)
  if (!coords) return null
  return coords
}

export function getDropPlacementByPointer(
  overRect: RectLike | null | undefined,
  pointer: { x: number; y: number } | null,
  previous: DropPlacement | null
): DropPlacement | null {
  if (!overRect || !pointer) return previous
  const top = pointer.y - overRect.top
  const bottom = overRect.bottom - pointer.y

  const verticalEdgeZone = overRect.height * 0.25
  if (top <= verticalEdgeZone) return 'above'
  if (bottom <= verticalEdgeZone) return 'below'

  const centerX = overRect.left + overRect.width / 2
  return pointer.x < centerX ? 'left' : 'right'
}
