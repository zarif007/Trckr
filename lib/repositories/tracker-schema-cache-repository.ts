import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFullTrackerSchemaForUser } from "./tracker-repository";
import { assembleTrackerDisplayProps } from "@/lib/tracker-schema";
import type { TrackerDisplayProps } from "@/app/components/tracker-display/types";

/**
 * Schema cache management for performance optimization.
 * Cache is invalidated whenever schemaVersion increments.
 */

export async function getCachedTrackerSchema(
  trackerId: string,
  userId: string,
): Promise<TrackerDisplayProps | null> {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId } },
    select: { id: true, schemaVersion: true },
  });
  if (!tracker) return null;

  const cache = await prisma.trackerSchemaCache.findFirst({
    where: {
      trackerId,
      schemaVersion: tracker.schemaVersion,
    },
    select: { assembledJson: true },
  });

  if (cache) {
    return cache.assembledJson as unknown as TrackerDisplayProps;
  }

  const full = await getFullTrackerSchemaForUser(trackerId, userId);
  if (!full) return null;

  const assembled = assembleTrackerDisplayProps(full);

  await prisma.trackerSchemaCache.upsert({
    where: { trackerId },
    create: {
      trackerId,
      schemaVersion: tracker.schemaVersion,
      assembledJson: assembled as unknown as Prisma.InputJsonValue,
    },
    update: {
      schemaVersion: tracker.schemaVersion,
      assembledJson: assembled as unknown as Prisma.InputJsonValue,
    },
  });

  return assembled;
}

/**
 * Called whenever schema is modified (after schemaVersion increment).
 */
export async function invalidateTrackerSchemaCache(
  trackerId: string,
): Promise<void> {
  await prisma.trackerSchemaCache.deleteMany({
    where: { trackerId },
  });
}
