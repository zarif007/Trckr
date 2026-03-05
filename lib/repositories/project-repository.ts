import { prisma } from '@/lib/db'

const PROJECT_FILE_TYPES = [
  'TEAMS',
  'SETTINGS',
  'RULES',
  'CONNECTIONS',
] as const

export async function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      projectFiles: {
        orderBy: { type: 'asc' },
      },
      trackerSchemas: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  })
}

export async function createProjectForUser(userId: string, name: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        userId,
        name,
      },
    })
    await tx.projectFile.createMany({
      data: PROJECT_FILE_TYPES.map((type) => ({
        projectId: project.id,
        type,
      })),
    })
    return tx.project.findUniqueOrThrow({
      where: { id: project.id },
      include: {
        projectFiles: {
          orderBy: { type: 'asc' },
        },
      },
    })
  })
}

export async function findProjectByIdForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      projectFiles: {
        orderBy: { type: 'asc' },
      },
      trackerSchemas: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  })
}

export async function findMostRecentProjectForUser(userId: string) {
  return prisma.project.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
}

