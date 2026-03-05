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
}) {
  const project = await resolveTargetProjectForTrackerCreate(params.userId, params.projectId)

  return prisma.trackerSchema.create({
    data: {
      projectId: project.id,
      name: params.name,
      instance: Instance.SINGLE,
      schema: params.schema,
    },
  })
}

