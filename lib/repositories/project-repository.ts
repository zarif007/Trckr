import { Instance, Prisma, SystemFileType, TrackerSchemaType } from "@prisma/client";

import { prisma } from "@/lib/db";

const SYSTEM_FILE_TYPES: SystemFileType[] = [
  SystemFileType.TEAMS,
  SystemFileType.SETTINGS,
  SystemFileType.RULES,
  SystemFileType.CONNECTIONS,
];

const SYSTEM_FILE_LABELS: Record<SystemFileType, string> = {
  [SystemFileType.TEAMS]: "Teams",
  [SystemFileType.SETTINGS]: "Settings",
  [SystemFileType.RULES]: "Rules",
  [SystemFileType.CONNECTIONS]: "Connections",
};

export async function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      trackerSchemas: {
        orderBy: { updatedAt: "desc" },
      },
      analyses: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, moduleId: true, updatedAt: true },
      },
      boards: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, moduleId: true, updatedAt: true },
      },
      modules: {
        orderBy: { updatedAt: "desc" },
        include: {
          trackerSchemas: { orderBy: { updatedAt: "desc" } },
        },
      },
      workflows: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          enabled: true,
          moduleId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function createProjectForUser(userId: string, name: string) {
  return prisma.$transaction(
    async (tx) => {
      const project = await tx.project.create({
        data: {
          userId,
          name,
        },
      });
      await tx.trackerSchema.createMany({
        data: SYSTEM_FILE_TYPES.map((systemType) => ({
          projectId: project.id,
          moduleId: null,
          name: SYSTEM_FILE_LABELS[systemType],
          type: TrackerSchemaType.SYSTEM,
          systemType,
          instance: Instance.SINGLE,
          versionControl: false,
          autoSave: true,
          meta: Prisma.JsonNull,
        })),
      });
      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: {
          trackerSchemas: { orderBy: { updatedAt: "desc" } },
          analyses: {
            orderBy: { updatedAt: "desc" },
            select: { id: true, name: true, moduleId: true, updatedAt: true },
          },
          boards: {
            orderBy: { updatedAt: "desc" },
            select: { id: true, name: true, moduleId: true, updatedAt: true },
          },
          workflows: {
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              name: true,
              description: true,
              enabled: true,
              moduleId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          modules: {
            orderBy: { updatedAt: "desc" },
            include: {
              trackerSchemas: { orderBy: { updatedAt: "desc" } },
            },
          },
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    },
  );
}

export async function findProjectByIdForUser(
  projectId: string,
  userId: string,
) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      trackerSchemas: {
        orderBy: { updatedAt: "desc" },
      },
      analyses: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, moduleId: true, updatedAt: true },
      },
      boards: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, moduleId: true, updatedAt: true },
      },
      modules: {
        orderBy: { updatedAt: "desc" },
        include: {
          trackerSchemas: { orderBy: { updatedAt: "desc" } },
        },
      },
      workflows: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          enabled: true,
          moduleId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function findMostRecentProjectForUser(userId: string) {
  return prisma.project.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateProjectForUser(
  projectId: string,
  userId: string,
  data: { name: string },
) {
  const existing = await findProjectByIdForUser(projectId, userId);
  if (!existing) return null;
  return prisma.project.update({
    where: { id: projectId },
    data: { name: data.name },
  });
}

export async function deleteProjectForUser(projectId: string, userId: string) {
  const existing = await findProjectByIdForUser(projectId, userId);
  if (!existing) return null;
  return prisma.project.delete({
    where: { id: projectId },
  });
}
