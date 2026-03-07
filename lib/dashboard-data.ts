import 'server-only'
import { auth } from '@/auth'
import {
  listProjectsForUser,
  findProjectByIdForUser,
} from '@/lib/repositories/project-repository'
import { findModuleByIdForUser } from '@/lib/repositories/module-repository'
import type { Project, Module } from '@/app/dashboard/dashboard-context'

type ProjectFromDb = Awaited<ReturnType<typeof findProjectByIdForUser>>
type ProjectFromList = Awaited<ReturnType<typeof listProjectsForUser>>[number]

/** Serialize Prisma result for RSC → client (dates become strings). */
function serializeProject(p: ProjectFromDb): Project | null {
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    userId: p.userId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    projectFiles: p.projectFiles.map((f) => ({
      id: f.id,
      projectId: f.projectId,
      type: f.type,
      content: f.content,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    trackerSchemas: p.trackerSchemas.map((t) => ({
      id: t.id,
      name: t.name,
      projectId: t.projectId,
      moduleId: t.moduleId,
      instance: t.instance,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    modules: p.modules.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      name: m.name,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      moduleFiles: m.moduleFiles.map((f) => ({
        id: f.id,
        moduleId: f.moduleId,
        type: f.type,
        content: f.content,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      trackerSchemas: m.trackerSchemas.map((t) => ({
        id: t.id,
        name: t.name,
        projectId: t.projectId,
        moduleId: t.moduleId,
        instance: t.instance,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    })),
  }
}

function serializeModule(
  m: Awaited<ReturnType<typeof findModuleByIdForUser>>,
): Module | null {
  if (!m) return null
  return {
    id: m.id,
    projectId: m.projectId,
    name: m.name,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    moduleFiles: m.moduleFiles.map((f) => ({
      id: f.id,
      moduleId: f.moduleId,
      type: f.type,
      content: f.content,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    trackerSchemas: m.trackerSchemas.map((t) => ({
      id: t.id,
      name: t.name,
      projectId: t.projectId,
      moduleId: t.moduleId,
      instance: t.instance,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  }
}

/** Serialize a project from list (modules may not have moduleFiles). */
function serializeProjectFromList(p: ProjectFromList): Project {
  return {
    id: p.id,
    name: p.name,
    userId: p.userId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    projectFiles: p.projectFiles.map((f) => ({
      id: f.id,
      projectId: f.projectId,
      type: f.type,
      content: f.content,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    trackerSchemas: p.trackerSchemas.map((t) => ({
      id: t.id,
      name: t.name,
      projectId: t.projectId,
      moduleId: t.moduleId,
      instance: t.instance,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    modules: p.modules.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      name: m.name,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      moduleFiles: [],
      trackerSchemas: m.trackerSchemas.map((t) => ({
        id: t.id,
        name: t.name,
        projectId: t.projectId,
        moduleId: t.moduleId,
        instance: t.instance,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    })),
  }
}

export async function getProjectsForUser(): Promise<Project[] | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const list = await listProjectsForUser(userId)
  return list.map((p) => serializeProjectFromList(p))
}

export async function getProjectForUser(
  projectId: string,
): Promise<Project | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const project = await findProjectByIdForUser(projectId, userId)
  return serializeProject(project)
}

export async function getModuleForUser(
  moduleId: string,
): Promise<Module | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const mod = await findModuleByIdForUser(moduleId, userId)
  return serializeModule(mod)
}

/** For module page: get module + project name in one pass (project name only, no full project). */
export async function getModuleAndProjectNameForUser(
  moduleId: string,
  projectId: string,
): Promise<{ module: Module; projectName: string | null } | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const mod = await findModuleByIdForUser(moduleId, userId)
  if (!mod) return null
  const project = await findProjectByIdForUser(projectId, userId)
  return {
    module: serializeModule(mod)!,
    projectName: project?.name ?? null,
  }
}
