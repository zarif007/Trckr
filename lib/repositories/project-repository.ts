import { prisma } from '@/lib/db'

export async function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      trackerSchemas: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  })
}

export async function createProjectForUser(userId: string, name: string) {
  return prisma.project.create({
    data: {
      userId,
      name,
    },
  })
}

export async function findProjectByIdForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
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

