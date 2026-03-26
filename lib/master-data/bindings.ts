import { prisma } from '@/lib/db'
import { createTrackerForUser } from '@/lib/repositories'
import { findOrCreateMasterDataModule } from './module'
import { buildMasterDataSchema, resolveLabelFieldId } from './schema'
import { isPlainObject, normalizeName, titleCase } from './utils'
import {
  normalizeMasterDataScope,
  resolveMasterDataScopeFromTracker,
  type MasterDataScope,
} from '@/lib/master-data-scope'

export type MasterDataBuildResult = {
  tracker: Record<string, unknown>
  createdTrackerIds: string[]
}

type Grid = { id?: string; sectionId?: string; name?: string }
type Field = { id?: string; dataType?: string; ui?: { label?: string } }
type LayoutNode = { gridId?: string; fieldId?: string; order?: number }

const PLACEHOLDER_SOURCE_IDS = new Set(['__master_data__', 'master_data', 'MASTER_DATA'])

export function isPlaceholderSourceId(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return PLACEHOLDER_SOURCE_IDS.has(value.trim())
}

function stripLocalOptionsGrids(tracker: Record<string, unknown>): Record<string, unknown> {
  const grids = Array.isArray(tracker.grids) ? (tracker.grids as Grid[]) : []
  const layoutNodes = Array.isArray(tracker.layoutNodes) ? (tracker.layoutNodes as LayoutNode[]) : []
  const fields = Array.isArray(tracker.fields) ? (tracker.fields as Field[]) : []
  const sections = Array.isArray(tracker.sections) ? (tracker.sections as Array<{ id?: string; tabId?: string }>) : []
  const tabs = Array.isArray(tracker.tabs) ? (tracker.tabs as Array<{ id?: string }>) : []

  const optionGridIds = new Set(grids.filter((g) => g.id?.endsWith('_options_grid')).map((g) => g.id!).filter(Boolean))
  if (optionGridIds.size === 0) return tracker

  const nextGrids = grids.filter((g) => !optionGridIds.has(g.id ?? ''))
  const nextLayoutNodes = layoutNodes.filter((n) => !optionGridIds.has(n.gridId ?? ''))

  const usedFieldIds = new Set(nextLayoutNodes.map((n) => n.fieldId).filter((id): id is string => typeof id === 'string'))
  const nextFields = fields.filter((f) => usedFieldIds.has(f.id ?? ''))

  const usedSectionIds = new Set(nextGrids.map((g) => g.sectionId).filter((id): id is string => typeof id === 'string'))
  const nextSections = sections.filter((s) => usedSectionIds.has(s.id ?? ''))

  const usedTabIds = new Set(nextSections.map((s) => s.tabId).filter((id): id is string => typeof id === 'string'))
  const nextTabs = tabs.filter((t) => usedTabIds.has(t.id ?? ''))

  return {
    ...tracker,
    grids: nextGrids,
    layoutNodes: nextLayoutNodes,
    fields: nextFields,
    sections: nextSections,
    tabs: nextTabs,
  }
}

function ensureBindingEntry(options: {
  bindings: Record<string, unknown>
  fieldPath: string
  optionsSourceSchemaId: string
  optionsGrid: string
  labelField: string
}) {
  const { bindings, fieldPath, optionsSourceSchemaId, optionsGrid, labelField } = options
  const existing = bindings[fieldPath] as Record<string, unknown> | undefined
  const existingMappings = Array.isArray(existing?.fieldMappings) ? (existing?.fieldMappings as Array<Record<string, unknown>>) : []
  const hasValueMapping = existingMappings.some((m) => m?.to === fieldPath)
  const valueMapping = { from: labelField, to: fieldPath }
  const fieldMappings = hasValueMapping ? existingMappings : [valueMapping, ...existingMappings]

  bindings[fieldPath] = {
    optionsSourceSchemaId,
    optionsGrid,
    labelField,
    fieldMappings,
  }
}

function resolveUnboundSelectFields(options: {
  tracker: Record<string, unknown>
  bindings: Record<string, unknown>
  gridByFieldId: Map<string, string>
}): Array<{ field: Field; fieldPath: string }> {
  const { tracker, bindings, gridByFieldId } = options
  const fields = Array.isArray(tracker.fields) ? (tracker.fields as Field[]) : []

  const unresolved: Array<{ field: Field; fieldPath: string }> = []
  for (const field of fields) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue
    if (!field.id) continue
    const gridId = gridByFieldId.get(field.id)
    if (!gridId) continue
    const fieldPath = `${gridId}.${field.id}`
    const existingBinding = bindings[fieldPath] as Record<string, unknown> | undefined
    const sourceId = existingBinding?.optionsSourceSchemaId
    if (sourceId && String(sourceId).trim().length > 0 && !isPlaceholderSourceId(sourceId)) continue
    unresolved.push({ field, fieldPath })
  }
  return unresolved
}

export async function applyMasterDataBindings(options: {
  tracker: Record<string, unknown>
  scope?: MasterDataScope | null
  projectId: string
  moduleId?: string | null
  userId: string
}): Promise<MasterDataBuildResult> {
  const { tracker, projectId, moduleId, userId } = options
  const scope = normalizeMasterDataScope(options.scope) ?? resolveMasterDataScopeFromTracker(tracker as { masterDataScope?: unknown })
  const nextTracker: Record<string, unknown> = { ...(tracker ?? {}), masterDataScope: scope }

  if (scope === 'tracker') {
    return { tracker: nextTracker, createdTrackerIds: [] }
  }

  const layoutNodes = Array.isArray(nextTracker.layoutNodes) ? (nextTracker.layoutNodes as LayoutNode[]) : []
  const bindings = isPlainObject(nextTracker.bindings) ? { ...(nextTracker.bindings as Record<string, unknown>) } : {}

  const gridByFieldId = new Map<string, string>()
  for (const node of layoutNodes) {
    if (!node?.fieldId || !node?.gridId) continue
    gridByFieldId.set(node.fieldId, node.gridId)
  }

  const unresolvedFields = resolveUnboundSelectFields({
    tracker: nextTracker,
    bindings,
    gridByFieldId,
  })

  if (unresolvedFields.length === 0) {
    const cleaned = stripLocalOptionsGrids(nextTracker)
    return { tracker: { ...cleaned, bindings }, createdTrackerIds: [] }
  }

  const masterDataModuleParent = scope === 'module' ? moduleId ?? null : null
  const masterDataModule = await findOrCreateMasterDataModule({
    projectId,
    parentModuleId: masterDataModuleParent,
    userId,
  })

  const existingMasterDataTrackers = await prisma.trackerSchema.findMany({
    where: {
      projectId,
      moduleId: masterDataModule.id,
      type: 'GENERAL',
    },
    select: { id: true, name: true, schema: true },
  })

  const trackerIndex = existingMasterDataTrackers.map((t) => ({
    id: t.id,
    name: t.name ?? '',
    normalized: normalizeName(t.name ?? ''),
    schema: t.schema as Record<string, unknown>,
  }))

  const createdTrackerIds: string[] = []
  const targetCache = new Map<string, { trackerId: string; gridId: string; labelFieldId: string }>()

  for (const entry of unresolvedFields) {
    const { field, fieldPath } = entry
    if (!field.id) continue

    const label = field.ui?.label ?? field.id
    const entityName = titleCase(String(label))
    const normalized = normalizeName(entityName)

    if (!targetCache.has(normalized)) {
      let match = trackerIndex.find((t) => t.normalized === normalized)
      let schema = match?.schema

      if (!match || !schema) {
        const created = await createTrackerForUser({
          userId,
          name: entityName,
          schema: buildMasterDataSchema(entityName) as object,
          projectId,
          moduleId: masterDataModule.id,
        })
        createdTrackerIds.push(created.id)
        schema = created.schema as Record<string, unknown>
        match = { id: created.id, name: created.name ?? '', normalized, schema }
        trackerIndex.push(match)
      }

      let target = schema ? resolveLabelFieldId(schema, field.id) : null
      if (!target) {
        const created = await createTrackerForUser({
          userId,
          name: entityName,
          schema: buildMasterDataSchema(entityName) as object,
          projectId,
          moduleId: masterDataModule.id,
        })
        createdTrackerIds.push(created.id)
        const createdSchema = created.schema as Record<string, unknown>
        trackerIndex.push({ id: created.id, name: created.name ?? '', normalized, schema: createdSchema })
        target = resolveLabelFieldId(createdSchema, field.id)
        if (!target) continue
        match = { id: created.id, name: created.name ?? '', normalized, schema: createdSchema }
      }

      targetCache.set(normalized, {
        trackerId: match.id,
        gridId: target.gridId,
        labelFieldId: target.labelFieldId,
      })
    }

    const target = targetCache.get(normalized)
    if (!target) continue

    ensureBindingEntry({
      bindings,
      fieldPath,
      optionsSourceSchemaId: target.trackerId,
      optionsGrid: target.gridId,
      labelField: `${target.gridId}.${target.labelFieldId}`,
    })
  }

  const cleaned = stripLocalOptionsGrids(nextTracker)
  return {
    tracker: { ...cleaned, bindings },
    createdTrackerIds,
  }
}
