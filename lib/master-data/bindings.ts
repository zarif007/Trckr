import { prisma } from '@/lib/db'
import { createTrackerForUser } from '@/lib/repositories'
import { findOrCreateMasterDataModule } from './module'
import { buildMasterDataSchema } from './schema'
import {
  buildMasterDataMeta,
  extractMasterDataFields,
  readMasterDataMeta,
  resolveLabelFieldId as resolveLabelFieldIdFromMeta,
  resolveMasterDataGridId,
  withMasterDataMeta,
} from './meta'
import { isPlainObject, normalizeName, titleCase } from './utils'
import type { MasterDataTrackerSpec } from '@/lib/schemas/multi-agent'
import {
  normalizeMasterDataScope,
  resolveMasterDataScopeFromTracker,
  type MasterDataScope,
} from '@/lib/master-data-scope'
import { buildFieldPath, parsePath } from '@/lib/resolve-bindings/path'
import type { MasterDataBindingAction } from './chat-audit/schema'
import { MASTER_DATA_TAB_ID } from './constants'

export type { MasterDataBindingAction } from './chat-audit/schema'

export type MasterDataBuildResult = {
  tracker: Record<string, unknown>
  createdTrackerIds: string[]
  actions: MasterDataBindingAction[]
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

/** Module/project scope: remove local Master Data tab chrome (AI sometimes emits it despite prompts). */
function stripModuleProjectMasterDataTab(tracker: Record<string, unknown>): Record<string, unknown> {
  const grids = Array.isArray(tracker.grids) ? (tracker.grids as Grid[]) : []
  const layoutNodes = Array.isArray(tracker.layoutNodes) ? (tracker.layoutNodes as LayoutNode[]) : []
  const fields = Array.isArray(tracker.fields) ? (tracker.fields as Field[]) : []
  const sections = Array.isArray(tracker.sections) ? (tracker.sections as Array<{ id?: string; tabId?: string }>) : []
  const tabs = Array.isArray(tracker.tabs) ? (tracker.tabs as Array<{ id?: string }>) : []

  const sectionIdsToRemove = new Set(
    sections.filter((s) => s.tabId === MASTER_DATA_TAB_ID).map((s) => s.id ?? '').filter(Boolean),
  )
  const hasOrphanMasterTab = tabs.some((t) => t.id === MASTER_DATA_TAB_ID)

  if (sectionIdsToRemove.size === 0 && !hasOrphanMasterTab) {
    return tracker
  }

  const gridIdsToRemove = new Set(
    grids.filter((g) => sectionIdsToRemove.has(g.sectionId ?? '')).map((g) => g.id ?? '').filter(Boolean),
  )

  const nextGrids = grids.filter((g) => !gridIdsToRemove.has(g.id ?? ''))
  const nextLayoutNodes = layoutNodes.filter((n) => !gridIdsToRemove.has(n.gridId ?? ''))
  const usedFieldIds = new Set(nextLayoutNodes.map((n) => n.fieldId).filter((id): id is string => typeof id === 'string'))
  const nextFields = fields.filter((f) => usedFieldIds.has(f.id ?? ''))
  const nextSections = sections.filter((s) => !sectionIdsToRemove.has(s.id ?? ''))
  const usedTabIds = new Set(nextSections.map((s) => s.tabId).filter((id): id is string => typeof id === 'string'))
  const nextTabs = tabs.filter((t) => (t.id === MASTER_DATA_TAB_ID ? false : usedTabIds.has(t.id ?? '')))

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
  optionsSourceKey?: string
  optionsGrid: string
  labelField: string
  optionsFieldIds?: Set<string>
}) {
  const { bindings, fieldPath, optionsSourceSchemaId, optionsSourceKey, optionsGrid, labelField, optionsFieldIds } =
    options
  const existing = bindings[fieldPath] as Record<string, unknown> | undefined
  const existingMappings = Array.isArray(existing?.fieldMappings)
    ? (existing?.fieldMappings as Array<Record<string, unknown>>)
    : []
  const normalizedMappings =
    optionsFieldIds && optionsFieldIds.size > 0
      ? existingMappings
          .map((m) => {
            const from = typeof m?.from === 'string' ? m.from : ''
            const to = typeof m?.to === 'string' ? m.to : ''
            if (!from || !to) return null
            const parsed = parsePath(from)
            if (!parsed.fieldId) return null
            if (!optionsFieldIds.has(parsed.fieldId)) return null
            return { from: buildFieldPath(optionsGrid, parsed.fieldId), to }
          })
          .filter((m): m is { from: string; to: string } => Boolean(m))
      : existingMappings
  const hasValueMapping = normalizedMappings.some((m) => m?.to === fieldPath)
  const valueMapping = { from: labelField, to: fieldPath }
  const fieldMappings = hasValueMapping ? normalizedMappings : [valueMapping, ...normalizedMappings]
  const existingKey = typeof existing?.optionsSourceKey === 'string' ? existing.optionsSourceKey : undefined
  const finalKey = optionsSourceKey ?? existingKey

  bindings[fieldPath] = {
    optionsSourceSchemaId,
    ...(finalKey ? { optionsSourceKey: finalKey } : {}),
    optionsGrid,
    labelField,
    fieldMappings,
  }
}

function resolveUnboundSelectFields(options: {
  tracker: Record<string, unknown>
  bindings: Record<string, unknown>
  gridByFieldId: Map<string, string>
}): Array<{ field: Field; fieldPath: string; binding?: Record<string, unknown> }> {
  const { tracker, bindings, gridByFieldId } = options
  const fields = Array.isArray(tracker.fields) ? (tracker.fields as Field[]) : []

  const unresolved: Array<{ field: Field; fieldPath: string; binding?: Record<string, unknown> }> = []
  for (const field of fields) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue
    if (!field.id) continue
    const gridId = gridByFieldId.get(field.id)
    if (!gridId) continue
    const fieldPath = `${gridId}.${field.id}`
    const existingBinding = bindings[fieldPath] as Record<string, unknown> | undefined
    const sourceId = existingBinding?.optionsSourceSchemaId
    if (sourceId && String(sourceId).trim().length > 0 && !isPlaceholderSourceId(sourceId)) continue
    unresolved.push({ field, fieldPath, binding: existingBinding })
  }
  return unresolved
}

export async function applyMasterDataBindings(options: {
  tracker: Record<string, unknown>
  scope?: MasterDataScope | null
  masterDataTrackers?: MasterDataTrackerSpec[]
  projectId: string
  moduleId?: string | null
  userId: string
}): Promise<MasterDataBuildResult> {
  const { tracker, projectId, moduleId, userId } = options
  const scope = normalizeMasterDataScope(options.scope) ?? resolveMasterDataScopeFromTracker(tracker as { masterDataScope?: unknown })
  const nextTracker: Record<string, unknown> = { ...(tracker ?? {}), masterDataScope: scope }

  if (scope === 'tracker') {
    return { tracker: nextTracker, createdTrackerIds: [], actions: [] }
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
    const afterOptions = stripLocalOptionsGrids(nextTracker)
    const cleaned = stripModuleProjectMasterDataTab(afterOptions)
    return { tracker: { ...cleaned, bindings }, createdTrackerIds: [], actions: [] }
  }

  const specs = Array.isArray(options.masterDataTrackers) ? options.masterDataTrackers : []
  const specsByKey = new Map<string, MasterDataTrackerSpec>()
  for (const spec of specs) {
    if (!spec || typeof spec !== 'object') continue
    const key = typeof spec.key === 'string' ? spec.key.trim() : ''
    if (!key) continue
    specsByKey.set(key, spec)
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

  const trackerIndex = existingMasterDataTrackers.map((t) => {
    const schema = t.schema as Record<string, unknown>
    const meta = readMasterDataMeta(schema) ?? buildMasterDataMeta({ schema })
    return {
      id: t.id,
      name: t.name ?? '',
      normalized: normalizeName(t.name ?? ''),
      schema,
      meta,
    }
  })

  const createdTrackerIds: string[] = []
  const actions: MasterDataBuildResult['actions'] = []
  const targetCache = new Map<
    string,
    { trackerId: string; gridId: string; labelFieldId: string; fieldIds: Set<string>; key?: string }
  >()
  const specCacheKey = (key: string) => `spec:${key}`
  const nameCacheKey = (name: string) => `name:${name}`

  const hasMasterDataGrid = (schema: Record<string, unknown>) => {
    return resolveMasterDataGridId(schema) != null
  }

  const findCompatibleBySpec = (spec: MasterDataTrackerSpec) => {
    const desiredSchema =
      spec && typeof spec.schema === 'object' && spec.schema && !Array.isArray(spec.schema)
        ? (spec.schema as Record<string, unknown>)
        : buildMasterDataSchema(spec.name)

    const desiredGridId = resolveMasterDataGridId(desiredSchema)
    const usableSchema = desiredGridId ? desiredSchema : buildMasterDataSchema(spec.name)
    let desiredFields = extractMasterDataFields(usableSchema, desiredGridId).fieldIds
    if (!desiredFields.length) {
      const fallback = buildMasterDataSchema(spec.name)
      desiredFields = extractMasterDataFields(fallback).fieldIds
      return { compatible: null, desiredSchema: fallback, desiredFields }
    }

    const candidates = trackerIndex.filter((t) => {
      const candidateGridId = resolveMasterDataGridId(t.schema, t.meta?.gridId)
      if (!candidateGridId) return false
      if (t.meta?.key && t.meta.key === spec.key) return true
      return t.normalized === normalizeName(spec.name)
    })

    const compatible = candidates.find((t) => desiredFields.every((id) => t.meta.fieldIds.includes(id)))
    return { compatible, desiredSchema: usableSchema, desiredFields }
  }

  for (const entry of unresolvedFields) {
    const { field, fieldPath, binding } = entry
    if (!field.id) continue

    const rawKey = typeof binding?.optionsSourceKey === 'string' ? binding.optionsSourceKey.trim() : ''
    const spec = rawKey ? specsByKey.get(rawKey) : undefined

    if (spec) {
      const cacheKey = specCacheKey(spec.key)
      if (!targetCache.has(cacheKey)) {
        const { compatible, desiredSchema } = findCompatibleBySpec(spec)
        if (compatible) {
          const fieldsInfo = extractMasterDataFields(compatible.schema, compatible.meta?.gridId)
          const labelFieldId = resolveLabelFieldIdFromMeta({
            fieldIds: fieldsInfo.fieldIds,
            fieldIdToLabel: fieldsInfo.fieldIdToLabel,
            preferredId: spec.labelFieldId,
          })
          const gridId = fieldsInfo.gridId ?? resolveMasterDataGridId(compatible.schema, compatible.meta?.gridId)
          if (!gridId) continue
          targetCache.set(cacheKey, {
            trackerId: compatible.id,
            gridId,
            labelFieldId,
            fieldIds: new Set(fieldsInfo.fieldIds),
            key: spec.key,
          })
          actions.push({ type: 'reuse', name: compatible.name || spec.name, key: spec.key, trackerId: compatible.id })
        } else {
          const schemaWithScope = { ...desiredSchema, masterDataScope: 'tracker' }
          const schemaWithMeta = withMasterDataMeta({
            schema: schemaWithScope,
            key: spec.key,
            preferredLabelFieldId: spec.labelFieldId,
          })
          const created = await createTrackerForUser({
            userId,
            name: spec.name,
            schema: schemaWithMeta as object,
            projectId,
            moduleId: masterDataModule.id,
          })
          createdTrackerIds.push(created.id)
          const meta = readMasterDataMeta(schemaWithMeta) ?? buildMasterDataMeta({
            schema: schemaWithMeta,
            key: spec.key,
            preferredLabelFieldId: spec.labelFieldId,
          })
          trackerIndex.push({
            id: created.id,
            name: created.name ?? '',
            normalized: normalizeName(created.name ?? ''),
            schema: schemaWithMeta,
            meta,
          })
          const gridId = meta.gridId ?? resolveMasterDataGridId(schemaWithMeta)
          if (!gridId) continue
          const fieldsInfo = extractMasterDataFields(schemaWithMeta, gridId)
          targetCache.set(cacheKey, {
            trackerId: created.id,
            gridId,
            labelFieldId: meta.labelFieldId,
            fieldIds: new Set(fieldsInfo.fieldIds),
            key: spec.key,
          })
          actions.push({ type: 'create', name: created.name ?? spec.name, key: spec.key, trackerId: created.id })
        }
      }

      const target = targetCache.get(cacheKey)
      if (!target) continue
      ensureBindingEntry({
        bindings,
        fieldPath,
        optionsSourceSchemaId: target.trackerId,
        optionsSourceKey: target.key,
        optionsGrid: target.gridId,
        labelField: `${target.gridId}.${target.labelFieldId}`,
        optionsFieldIds: target.fieldIds,
      })
      continue
    }

    const label = field.ui?.label ?? field.id
    const entityName = titleCase(String(label))
    const normalized = normalizeName(entityName)

    const fallbackKey = nameCacheKey(normalized)
    if (!targetCache.has(fallbackKey)) {
      let match = trackerIndex.find((t) => t.normalized === normalized && hasMasterDataGrid(t.schema))
      if (!match) {
        const fallbackSchema = buildMasterDataSchema(entityName)
        const schemaWithMeta = withMasterDataMeta({
          schema: { ...fallbackSchema, masterDataScope: 'tracker' },
          key: normalized || undefined,
          preferredLabelFieldId: 'value',
        })
        const created = await createTrackerForUser({
          userId,
          name: entityName,
          schema: schemaWithMeta as object,
          projectId,
          moduleId: masterDataModule.id,
        })
        createdTrackerIds.push(created.id)
        const meta = readMasterDataMeta(schemaWithMeta) ?? buildMasterDataMeta({ schema: schemaWithMeta })
        match = {
          id: created.id,
          name: created.name ?? '',
          normalized,
          schema: schemaWithMeta,
          meta,
        }
        trackerIndex.push(match)
        actions.push({ type: 'create', name: created.name ?? entityName, trackerId: created.id })
      } else {
        actions.push({ type: 'reuse', name: match.name || entityName, trackerId: match.id })
      }

      const fieldsInfo = extractMasterDataFields(match.schema, match.meta?.gridId)
      const labelFieldId = resolveLabelFieldIdFromMeta({
        fieldIds: fieldsInfo.fieldIds,
        fieldIdToLabel: fieldsInfo.fieldIdToLabel,
        preferredId: match.meta?.labelFieldId,
      })
      const gridId = fieldsInfo.gridId ?? resolveMasterDataGridId(match.schema, match.meta?.gridId)
      if (!gridId) continue
      targetCache.set(fallbackKey, {
        trackerId: match.id,
        gridId,
        labelFieldId,
        fieldIds: new Set(fieldsInfo.fieldIds),
      })
    }

    const target = targetCache.get(fallbackKey)
    if (!target) continue
    ensureBindingEntry({
      bindings,
      fieldPath,
      optionsSourceSchemaId: target.trackerId,
      optionsGrid: target.gridId,
      labelField: `${target.gridId}.${target.labelFieldId}`,
      optionsFieldIds: target.fieldIds,
    })
  }

  const afterOptions = stripLocalOptionsGrids(nextTracker)
  const cleaned = stripModuleProjectMasterDataTab(afterOptions)
  return {
    tracker: { ...cleaned, bindings },
    createdTrackerIds,
    actions,
  }
}
