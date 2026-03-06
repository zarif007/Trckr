import { type ProjectFileType } from '@prisma/client'
import { prisma } from '@/lib/db'

export async function listModulesForProject(projectId: string, userId: string) {
  return prisma.module.findMany({
    where: {
      projectId,
      project: { userId },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      moduleFiles: { orderBy: { type: 'asc' } },
      trackerSchemas: { orderBy: { updatedAt: 'desc' } },
    },
  })
}

export async function createModuleForProject(
  projectId: string,
  userId: string,
  name: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  })
  if (!project) return null

  return prisma.module.create({
    data: { projectId: project.id, name },
    include: {
      moduleFiles: { orderBy: { type: 'asc' } },
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
      moduleFiles: { orderBy: { type: 'asc' } },
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
      moduleFiles: { orderBy: { type: 'asc' } },
      trackerSchemas: { orderBy: { updatedAt: 'desc' } },
    },
  })
}

export async function deleteModuleForUser(moduleId: string, userId: string) {
  const existing = await findModuleByIdForUser(moduleId, userId)
  if (!existing) return null

  return prisma.module.delete({ where: { id: moduleId } })
}

export async function addModuleFile(
  moduleId: string,
  userId: string,
  type: ProjectFileType,
) {
  const mod = await findModuleByIdForUser(moduleId, userId)
  if (!mod) return null

  return prisma.moduleFile.upsert({
    where: { moduleId_type: { moduleId, type } },
    update: {},
    create: { moduleId, type },
  })
}

export async function findModuleFileForUser(
  fileId: string,
  userId: string,
) {
  return prisma.moduleFile.findFirst({
    where: {
      id: fileId,
      module: { project: { userId } },
    },
  })
}

export async function updateModuleFileForUser(
  fileId: string,
  userId: string,
  content: unknown,
) {
  const existing = await findModuleFileForUser(fileId, userId)
  if (!existing) return null

  return prisma.moduleFile.update({
    where: { id: fileId },
    data: { content: content as object },
  })
}

/**
 * Returns the effective config for a given type within a module:
 * module-level override if it exists, otherwise the project-level config.
 */
export async function getEffectiveConfig(
  moduleId: string,
  userId: string,
  type: ProjectFileType,
) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, project: { userId } },
    select: {
      id: true,
      projectId: true,
      moduleFiles: { where: { type } },
    },
  })
  if (!mod) return null

  if (mod.moduleFiles.length > 0) {
    return { source: 'module' as const, content: mod.moduleFiles[0].content }
  }

  const projectFile = await prisma.projectFile.findFirst({
    where: { projectId: mod.projectId, type },
  })

  return {
    source: 'project' as const,
    content: projectFile?.content ?? {},
  }
}
