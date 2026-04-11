import type { CollisionDetection } from "@dnd-kit/core";
import { closestCenter, pointerWithin } from "@dnd-kit/core";

/**
 * Prefer swimlane hit targets under the pointer; fall back to center for keyboard / edge cases.
 */
export const timelinePointerThenCenterCollision: CollisionDetection = (
  args,
) => {
  const inside = pointerWithin(args);
  if (inside.length) return inside;
  return closestCenter(args);
};
