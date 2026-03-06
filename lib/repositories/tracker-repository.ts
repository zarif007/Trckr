import { Instance } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  createProjectForUser,
  findMostRecentProjectForUser,
} from './project-repository'

export async function findTrackerByIdForUser(trackerId: string, userId: string) {
  return prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId },
    },
  })
}

export async function updateTrackerByIdForUser(
  trackerId: string,
  userId: string,
  update: { name?: string | null; schema?: object },
) {
  const existing = await findTrackerByIdForUser(trackerId, userId)
  if (!existing) return null

  if (Object.keys(update).length === 0) return existing

  return prisma.trackerSchema.update({
    where: { id: trackerId },
    data: update,
  })
}

export async function deleteTrackerByIdForUser(trackerId: string, userId: string) {
  const existing = await findTrackerByIdForUser(trackerId, userId)
  if (!existing) return null
  return prisma.trackerSchema.delete({
    where: { id: trackerId },
  })
}

export async function resolveTargetProjectForTrackerCreate(
  userId: string,
  preferredProjectId?: string,
) {
  if (preferredProjectId) {
    const owned = await prisma.project.findFirst({
      where: { id: preferredProjectId, userId },
      select: { id: true },
    })
    if (owned) return owned
  }

  const recent = await findMostRecentProjectForUser(userId)
  if (recent) return { id: recent.id }

  const created = await createProjectForUser(userId, 'My Project')
  return { id: created.id }
}

export async function createTrackerForUser(params: {
  userId: string
  name: string
  schema: object
  projectId?: string
  moduleId?: string
}) {
  const project = await resolveTargetProjectForTrackerCreate(params.userId, params.projectId)

  if (params.moduleId) {
    const mod = await prisma.module.findFirst({
      where: { id: params.moduleId, projectId: project.id },
      select: { id: true },
    })
    if (!mod) {
      throw new Error('Module not found or does not belong to project')
    }
  }

  return prisma.trackerSchema.create({
    data: {
      projectId: project.id,
      moduleId: params.moduleId ?? null,
      name: params.name,
      instance: Instance.SINGLE,
      schema: params.schema,
    },
  })
}

