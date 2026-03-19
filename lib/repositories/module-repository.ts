import { Instance, SystemFileType, TrackerSchemaType } from '@prisma/client'
import { createEmptyTrackerSchema } from '@/app/components/tracker-display/tracker-editor/constants'
import { prisma } from '@/lib/db'

export async function listModulesForProject(projectId: string, userId: string) {
  return prisma.module.findMany({
    where: {
      projectId,
      project: { userId },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      trackerSchemas: { orderBy: { updatedAt: 'desc' } },
    },
  })
}

export async function createModuleForProject(
  projectId: string,
  userId: string,
  name: string,
  parentId?: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  })
  if (!project) return null

  if (parentId) {
    const parent = await prisma.module.findFirst({
      where: { id: parentId, projectId: project.id, project: { userId } },
      select: { id: true },
    })
    if (!parent) return null
  }

  return prisma.module.create({
    data: {
      projectId: project.id,
      name,
      parentId: parentId ?? null,
    },
    include: {
      trackerSchemas: { orderBy: { updatedAt: 'desc' } },
    },
  })
}

export async function findModuleByIdForUser(moduleId: string, userId: string) {
  return prisma.module.findFirst({
    where: {
      id: moduleId,
      project: { userId },
    },
    include: {
      trackerSchemas: { orderBy: { updatedAt: 'desc' } },
    },
  })
}

export async function updateModuleForUser(
  moduleId: string,
  userId: string,
  update: { name?: string },
) {
  const existing = await findModuleByIdForUser(moduleId, userId)
  if (!existing) return null
  if (Object.keys(update).length === 0) return existing

  return prisma.module.update({
    where: { id: moduleId },
    data: update,
    include: {
      trackerSchemas: { orderBy: { updatedAt: 'desc' } },
    },
  })
}

export async function deleteModuleForUser(moduleId: string, userId: string) {
  const existing = await findModuleByIdForUser(moduleId, userId)
  if (!existing) return null

  const children = await prisma.module.findMany({
    where: { parentId: moduleId },
    select: { id: true },
  })
  for (const child of children) {
    await deleteModuleForUser(child.id, userId)
  }

  return prisma.module.delete({ where: { id: moduleId } })
}

export async function addModuleSystemFile(
  moduleId: string,
  userId: string,
  systemType: SystemFileType,
) {
  const mod = await findModuleByIdForUser(moduleId, userId)
  if (!mod) return null

  return prisma.trackerSchema.upsert({
    where: {
      projectId_moduleId_systemType: {
        projectId: mod.projectId,
        moduleId,
        systemType,
      },
    },
    update: {},
    create: {
      projectId: mod.projectId,
      moduleId,
      name:
        systemType === SystemFileType.TEAMS
          ? 'Teams'
          : systemType === SystemFileType.SETTINGS
            ? 'Settings'
            : systemType === SystemFileType.RULES
              ? 'Rules'
              : 'Connections',
      type: TrackerSchemaType.SYSTEM,
      systemType,
      instance: Instance.SINGLE,
      versionControl: false,
      autoSave: true,
      schema: createEmptyTrackerSchema() as object,
    },
  })
}
