import 'server-only'
import { auth } from '@/auth'
import {
  listProjectsForUser,
  findProjectByIdForUser,
} from '@/lib/repositories/project-repository'
import { findModuleByIdForUser } from '@/lib/repositories/module-repository'
import type { Project, Module } from '@/app/dashboard/dashboard-context'

type ProjectFromDb = NonNullable<
  Awaited<ReturnType<typeof findProjectByIdForUser>>
>
type ProjectFromList = Awaited<ReturnType<typeof listProjectsForUser>>[number]

type FlatModule = Omit<Module, 'children'> & { parentId: string | null }

function serializeModuleFlat(m: ProjectFromDb['modules'][number]): FlatModule {
  return {
    id: m.id,
    projectId: m.projectId,
    parentId: m.parentId ?? null,
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

/** Build tree from flat list: roots have no parentId, each node gets children. */
function buildModuleTree(flat: FlatModule[]): Module[] {
  const byParent = new Map<string | null, FlatModule[]>()
  for (const m of flat) {
    const key = m.parentId
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(m)
  }
  function toNode(m: FlatModule): Module {
    const children = (byParent.get(m.id) ?? []).map(toNode)
    return { ...m, children }
  }
  return (byParent.get(null) ?? []).map(toNode)
}

/** Serialize Prisma result for RSC → client (dates become strings). */
function serializeProject(p: ProjectFromDb): Project | null {
  if (!p) return null
  const flatModules = p.modules.map(serializeModuleFlat)
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
    modules: buildModuleTree(flatModules),
  }
}

function serializeModule(
  m: Awaited<ReturnType<typeof findModuleByIdForUser>>,
): Module | null {
  if (!m) return null
  return {
    id: m.id,
    projectId: m.projectId,
    parentId: m.parentId ?? null,
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
    children: [],
  }
}

/** Serialize a project from list (modules may not have moduleFiles). */
function serializeProjectFromList(p: ProjectFromList): Project {
  const flatModules: FlatModule[] = p.modules.map((m) => ({
    id: m.id,
    projectId: m.projectId,
    parentId: m.parentId ?? null,
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
  }))
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
    modules: buildModuleTree(flatModules),
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
  return project ? serializeProject(project) : null
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

/** Get module with children (from project tree) for API. */
export async function getModuleWithChildrenForUser(
  moduleId: string,
): Promise<Module | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const mod = await findModuleByIdForUser(moduleId, userId)
  if (!mod) return null
  const project = await getProjectForUser(mod.projectId)
  if (!project) return null
  const path = findModulePathInTree(project.modules, moduleId)
  return path?.[path.length - 1] ?? serializeModule(mod)
}

/** Find a module in tree by id and return path from root to it (breadcrumb). */
function findModulePathInTree(
  roots: Module[],
  targetId: string,
  path: Module[] = [],
): Module[] | null {
  for (const m of roots) {
    const next = [...path, m]
    if (m.id === targetId) return next
    const found = findModulePathInTree(m.children, targetId, next)
    if (found) return found
  }
  return null
}

/** For module page: get module (with children), project name, and breadcrumb. */
export async function getModuleAndProjectNameForUser(
  moduleId: string,
  projectId: string,
): Promise<{
  module: Module
  projectName: string | null
  breadcrumb: { id: string; name: string }[]
} | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const mod = await findModuleByIdForUser(moduleId, userId)
  if (!mod) return null
  const project = await getProjectForUser(projectId)
  if (!project) return null
  const path = findModulePathInTree(project.modules, moduleId)
  const breadcrumb = path
    ? path.map((m) => ({ id: m.id, name: m.name ?? 'Untitled module' }))
    : []
  const moduleInTree = path?.[path.length - 1]
  return {
    module: moduleInTree ?? serializeModule(mod)!,
    projectName: project.name ?? null,
    breadcrumb,
  }
}
