import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
 project: { findFirst: vi.fn() },
 module: { findMany: vi.fn(), create: vi.fn() },
}))

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))

import { findOrCreateMasterDataModule } from '@/lib/master-data/module'

describe('findOrCreateMasterDataModule', () => {
 beforeEach(() => {
 vi.clearAllMocks()
 })

 it('reuses an existing master data module', async () => {
 prismaMock.project.findFirst.mockResolvedValue({ id: 'project-1' })
 prismaMock.module.findMany.mockResolvedValue([
 { id: 'mod-1', name: 'Master Data', settings: { masterDataModule: true } },
 ])

 const result = await findOrCreateMasterDataModule({
 projectId: 'project-1',
 parentModuleId: null,
 userId: 'user-1',
 })

 expect(result).toEqual({ id: 'mod-1', name: 'Master Data', settings: { masterDataModule: true } })
 expect(prismaMock.module.create).not.toHaveBeenCalled()
 })

 it('creates a master data module when missing', async () => {
 prismaMock.project.findFirst.mockResolvedValue({ id: 'project-1' })
 prismaMock.module.findMany.mockResolvedValue([{ id: 'mod-2', name: 'Reports', settings: {} }])
 prismaMock.module.create.mockResolvedValue({
 id: 'mod-3',
 name: 'Master Data',
 settings: { masterDataModule: true },
 })

 const result = await findOrCreateMasterDataModule({
 projectId: 'project-1',
 parentModuleId: 'parent-1',
 userId: 'user-1',
 })

 expect(result).toEqual({ id: 'mod-3', name: 'Master Data', settings: { masterDataModule: true } })
 expect(prismaMock.module.create).toHaveBeenCalledWith({
 data: {
 projectId: 'project-1',
 parentId: 'parent-1',
 name: 'Master Data',
 settings: { masterDataModule: true },
 },
 select: { id: true, name: true, settings: true },
 })
 })
})
