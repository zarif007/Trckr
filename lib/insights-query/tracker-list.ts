import "server-only";

import { prisma } from "@/lib/db";

/** Tracker picker options for report/analysis creation (GENERAL schemas in a project/module). */
export async function listTrackersForScope(
  userId: string,
  projectId: string,
  moduleId?: string | null,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) return null;

  return prisma.trackerSchema.findMany({
    where: {
      projectId,
      type: "GENERAL",
      ...(moduleId != null ? { moduleId } : {}),
    },
    select: {
      id: true,
      name: true,
      instance: true,
      moduleId: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}
