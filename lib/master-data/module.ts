import { prisma } from '@/lib/db'
import { isMasterDataModuleSettings } from '@/lib/master-data-scope'
import { MASTER_DATA_MODULE_NAME } from './constants'

export async function findOrCreateMasterDataModule(options: {
 projectId: string
 parentModuleId?: string | null
 userId: string
}) {
 const { projectId, parentModuleId, userId } = options
 const project = await prisma.project.findFirst({
 where: { id: projectId, userId },
 select: { id: true },
 })
 if (!project) throw new Error('Project not found or access denied')

 const candidates = await prisma.module.findMany({
 where: {
 projectId: project.id,
 parentId: parentModuleId ?? null,
 },
 select: { id: true, name: true, settings: true },
 })

 const existing = candidates.find((m) => isMasterDataModuleSettings(m.settings))
 if (existing) return existing

 return prisma.module.create({
 data: {
 projectId: project.id,
 parentId: parentModuleId ?? null,
 name: MASTER_DATA_MODULE_NAME,
 settings: { masterDataModule: true },
 },
 select: { id: true, name: true, settings: true },
 })
}
