import { prisma } from '@/lib/db'
import { parseProjectModuleSettings, type MasterDataScope } from '@/lib/master-data-scope'

export type MasterDataDefaultResolution = {
 inheritedDefault: MasterDataScope | null
 inheritedSource: 'none' | 'module' | 'project'
 inheritedSourceModuleId?: string
}

export async function resolveMasterDataDefaultScope(options: {
 projectId: string
 userId: string
 moduleId?: string | null
}): Promise<MasterDataDefaultResolution> {
 const { projectId, userId, moduleId } = options
 const project = await prisma.project.findFirst({
 where: { id: projectId, userId },
 select: { id: true, settings: true },
 })
 if (!project) {
 return { inheritedDefault: null, inheritedSource: 'none' }
 }

 let inheritedDefault: MasterDataScope | null = null
 let inheritedSource: MasterDataDefaultResolution['inheritedSource'] = 'none'
 let inheritedSourceModuleId: string | undefined

 let currentModuleId = moduleId ?? null
 while (currentModuleId) {
 const moduleRow = await prisma.module.findFirst({
 where: { id: currentModuleId, projectId: project.id, project: { userId } },
 select: { id: true, parentId: true, settings: true },
 })
 if (!moduleRow) break
 const parsed = parseProjectModuleSettings(moduleRow.settings)
 if (parsed.masterDataDefaultScope) {
 inheritedDefault = parsed.masterDataDefaultScope
 inheritedSource = 'module'
 inheritedSourceModuleId = moduleRow.id
 break
 }
 currentModuleId = moduleRow.parentId ?? null
 }

 if (!inheritedDefault) {
 const parsedProject = parseProjectModuleSettings(project.settings)
 if (parsedProject.masterDataDefaultScope) {
 inheritedDefault = parsedProject.masterDataDefaultScope
 inheritedSource = 'project'
 }
 }

 return {
 inheritedDefault,
 inheritedSource,
 ...(inheritedSourceModuleId ? { inheritedSourceModuleId } : {}),
 }
}
