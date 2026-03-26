import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  project: { findFirst: vi.fn() },
  module: { findMany: vi.fn() },
  trackerSchema: { findMany: vi.fn() },
}))

const createTrackerForUserMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/repositories', () => ({ createTrackerForUser: createTrackerForUserMock }))

import { applyMasterDataBindings } from '@/lib/master-data/bindings'
import { buildMasterDataSchema } from '@/lib/master-data/schema'

describe('applyMasterDataBindings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('replaces placeholders with master data tracker bindings and strips local option grids', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'project-1' })
    prismaMock.module.findMany.mockResolvedValue([
      { id: 'md-mod-1', name: 'Master Data', settings: { masterDataModule: true } },
    ])

    const masterDataSchema = buildMasterDataSchema('Status')
    prismaMock.trackerSchema.findMany.mockResolvedValue([
      { id: 'md-tracker-1', name: 'Status', schema: masterDataSchema },
    ])

    const tracker = {
      masterDataScope: 'module',
      tabs: [{ id: 'overview_tab', name: 'Overview', placeId: 0, config: {} }],
      sections: [{ id: 'main_section', name: 'Main', tabId: 'overview_tab', placeId: 1, config: {} }],
      grids: [
        {
          id: 'orders_grid',
          name: 'Orders',
          sectionId: 'main_section',
          placeId: 1,
          config: {},
          views: [{ id: 'orders_table_view', name: 'Table', type: 'table', config: {} }],
        },
        {
          id: 'status_options_grid',
          name: 'Status',
          sectionId: 'main_section',
          placeId: 2,
          config: {},
          views: [{ id: 'status_table_view', name: 'Table', type: 'table', config: {} }],
        },
      ],
      fields: [
        { id: 'status', dataType: 'options', ui: { label: 'Status' }, config: {} },
        { id: 'status_option', dataType: 'string', ui: { label: 'Status' }, config: {} },
      ],
      layoutNodes: [
        { gridId: 'orders_grid', fieldId: 'status', order: 1 },
        { gridId: 'status_options_grid', fieldId: 'status_option', order: 1 },
      ],
      bindings: {
        'orders_grid.status': {
          optionsGrid: 'status_options_grid',
          labelField: 'status_options_grid.status_option',
          fieldMappings: [{ from: 'status_options_grid.status_option', to: 'orders_grid.status' }],
          optionsSourceSchemaId: '__master_data__',
        },
      },
    }

    const result = await applyMasterDataBindings({
      tracker,
      scope: 'module',
      projectId: 'project-1',
      moduleId: 'module-1',
      userId: 'user-1',
    })

    const binding = (result.tracker.bindings as Record<string, unknown>)['orders_grid.status'] as {
      optionsSourceSchemaId: string
      optionsGrid: string
      labelField: string
    }

    expect(binding.optionsSourceSchemaId).toBe('md-tracker-1')
    expect(binding.optionsGrid).toBe('master_data_grid')
    expect(binding.labelField).toBe('master_data_grid.name')
    expect((result.tracker.grids as Array<{ id: string }>).some((g) => g.id === 'orders_grid')).toBe(true)
    expect((result.tracker.grids as Array<{ id: string }>).some((g) => g.id === 'status_options_grid')).toBe(false)
    expect((result.tracker.fields as Array<{ id: string }>).some((f) => f.id === 'status_option')).toBe(false)
    expect(createTrackerForUserMock).not.toHaveBeenCalled()
  })

  it('skips master data lookup when all bindings are already resolved', async () => {
    const tracker = {
      masterDataScope: 'project',
      tabs: [{ id: 'overview_tab', name: 'Overview', placeId: 0, config: {} }],
      sections: [{ id: 'main_section', name: 'Main', tabId: 'overview_tab', placeId: 1, config: {} }],
      grids: [
        {
          id: 'orders_grid',
          name: 'Orders',
          sectionId: 'main_section',
          placeId: 1,
          config: {},
          views: [{ id: 'orders_table_view', name: 'Table', type: 'table', config: {} }],
        },
      ],
      fields: [{ id: 'status', dataType: 'options', ui: { label: 'Status' }, config: {} }],
      layoutNodes: [{ gridId: 'orders_grid', fieldId: 'status', order: 1 }],
      bindings: {
        'orders_grid.status': {
          optionsGrid: 'master_data_grid',
          labelField: 'master_data_grid.name',
          fieldMappings: [{ from: 'master_data_grid.name', to: 'orders_grid.status' }],
          optionsSourceSchemaId: 'resolved-schema-id',
        },
      },
    }

    await applyMasterDataBindings({
      tracker,
      scope: 'project',
      projectId: 'project-1',
      moduleId: null,
      userId: 'user-1',
    })

    expect(prismaMock.module.findMany).not.toHaveBeenCalled()
    expect(prismaMock.trackerSchema.findMany).not.toHaveBeenCalled()
  })
})
