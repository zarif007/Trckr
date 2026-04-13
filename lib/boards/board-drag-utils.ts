import type { DragMoveEvent, DragEndEvent } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";

export type DropPlacement = "left" | "right" | "above" | "below";

const DROP_ZONE_PREFIX = "board-widget-dz";

/**
 * Generate drop zone ID for a widget and placement direction.
 *
 * Format: "board-widget-dz::widgetId::placement"
 */
export function widgetDropZoneId(
  widgetId: string,
  placement: DropPlacement,
): string {
  return `${DROP_ZONE_PREFIX}::${widgetId}::${placement}`;
}

/**
 * Parse drop zone ID to extract widget ID and placement direction.
 *
 * @returns Parsed data or null if invalid format
 */
export function parseDropZoneId(id: string): {
  widgetId: string;
  placement: DropPlacement;
} | null {
  if (!id.startsWith(`${DROP_ZONE_PREFIX}::`)) return null;

  const parts = id.split("::");
  if (parts.length !== 3) return null;

  const [, widgetId, placement] = parts;
  if (!["left", "right", "above", "below"].includes(placement)) {
    return null;
  }

  return { widgetId, placement: placement as DropPlacement };
}

/**
 * Get pointer coordinates from drag event.
 */
export function getPointerCoordinates(
  event: DragMoveEvent | DragEndEvent,
): { x: number; y: number } | null {
  return getEventCoordinates(event.activatorEvent);
}

/**
 * Determine drop placement based on pointer position within widget rect.
 *
 * - Top 25% edge: "above"
 * - Bottom 25% edge: "below"
 * - Left half of middle zone: "left"
 * - Right half of middle zone: "right"
 *
 * @param overRect - Bounding rect of widget being hovered
 * @param pointer - Pointer coordinates
 * @param previous - Previous placement (used as fallback if data is incomplete)
 */
export function getDropPlacementByPointer(
  overRect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  } | null,
  pointer: { x: number; y: number } | null,
  previous: DropPlacement | null,
): DropPlacement | null {
  if (!overRect || !pointer) return previous;

  const top = pointer.y - overRect.top;
  const bottom = overRect.bottom - pointer.y;

  // 25% edge zones for vertical placement
  const verticalEdgeZone = overRect.height * 0.25;
  if (top <= verticalEdgeZone) return "above";
  if (bottom <= verticalEdgeZone) return "below";

  // Horizontal middle zone (left vs right)
  const centerX = overRect.left + overRect.width / 2;
  return pointer.x < centerX ? "left" : "right";
}
