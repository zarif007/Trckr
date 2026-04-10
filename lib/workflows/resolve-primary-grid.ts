/**
 * Resolves the primary writable grid for a tracker (V2 workflows).
 * Uses the first GRID `TrackerNode` ordered by `placeId` ascending until a dedicated writable flag exists.
 */

import { prisma } from "@/lib/db";

export async function getPrimaryGridSlug(
  trackerSchemaId: string,
): Promise<string> {
  const grid = await prisma.trackerNode.findFirst({
    where: {
      trackerId: trackerSchemaId,
      type: "GRID",
    },
    orderBy: { placeId: "asc" },
    select: { slug: true },
  });
  if (!grid) {
    throw new Error(
      `No grid found for tracker ${trackerSchemaId}; cannot run workflow action`,
    );
  }
  return grid.slug;
}
