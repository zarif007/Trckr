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

/**
 * Resolves a unique tracker name within a project/module scope.
 * If the name already exists, appends " (1)", " (2)", etc. — like OS file naming.
 */
export async function resolveUniqueTrackerName(
  baseName: string,
  projectId: string,
  moduleId?: string | null,
): Promise<string> {
  const scopeWhere = moduleId
    ? { projectId, moduleId }
    : { projectId, moduleId: null }

  const existing = await prisma.trackerSchema.findMany({
    where: scopeWhere,
    select: { name: true },
  })

  const existingNames = new Set(existing.map((t) => t.name?.trim() ?? ''))

  if (!existingNames.has(baseName)) return baseName

  let counter = 1
  while (existingNames.has(`${baseName} (${counter})`)) {
    counter++
  }
  return `${baseName} (${counter})`
}

export async function createTrackerForUser(params: {
  userId: string
  name: string
  schema: object
  projectId?: string
  moduleId?: string
  instance?: 'SINGLE' | 'MULTI'
  versionControl?: boolean
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

  const instance = params.instance === 'MULTI' ? Instance.MULTI : Instance.SINGLE
  // Version control is only supported for single-instance trackers
  const versionControl = instance === Instance.SINGLE ? (params.versionControl ?? false) : false

  const resolvedName = await resolveUniqueTrackerName(
    params.name,
    project.id,
    params.moduleId,
  )

  const tracker = await prisma.trackerSchema.create({
    data: {
      projectId: project.id,
      moduleId: params.moduleId ?? null,
      name: resolvedName,
      instance,
      versionControl,
      schema: params.schema,
    },
  })

  // For MULTI instance: auto-create the ".list" companion schema
  if (instance === Instance.MULTI) {
    const listName = await resolveUniqueTrackerName(
      `${resolvedName}.list`,
      project.id,
      params.moduleId,
    )
    await prisma.trackerSchema.create({
      data: {
        projectId: project.id,
        moduleId: params.moduleId ?? null,
        name: listName,
        instance: Instance.MULTI,
        versionControl: false,
        listForSchemaId: tracker.id,
        // List companion has the same schema structure as the parent
        schema: params.schema,
      },
    })
  }

  return tracker
}
