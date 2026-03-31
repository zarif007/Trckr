/**
 * Master Data Agent — Phase 2 of the build-tracker pipeline.
 *
 * Looks up or creates master data trackers in the correct folder (Master Data module)
 * before the builder runs. Returns real tracker IDs the builder embeds directly in bindings,
 * eliminating the need to create local master data grids on the primary tracker.
 *
 * This agent is deterministic (no LLM involved). It uses server-side DB functions as its
 * "tools": findOrCreateMasterDataModule, createTrackerForUser, etc.
 */

import { prisma } from '@/lib/db'
import type { RequestLogContext } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'
import type { AgentStreamEvent } from '@/lib/agent/events'
import { createTrackerForUser } from '@/lib/repositories'
import { findOrCreateMasterDataModule } from '@/lib/master-data/module'
import { buildMasterDataSchema } from '@/lib/master-data/schema'
import {
  buildMasterDataMeta,
  extractMasterDataFields,
  readMasterDataMeta,
  resolveLabelFieldId as resolveLabelFieldIdFromMeta,
  resolveMasterDataGridId,
  withMasterDataMeta,
} from '@/lib/master-data/meta'
import { normalizeName } from '@/lib/master-data/utils'

export interface RequiredMasterDataEntry {
  key: string
  name: string
  labelFieldId?: string
}

export interface ResolvedMasterDataEntry {
  key: string
  name: string
  trackerId: string
  gridId: string
  labelFieldId: string
}

export interface MasterDataAgentOptions {
  logContext?: RequestLogContext
  userId: string
  projectId: string
  moduleId?: string | null
  scope: 'module' | 'project'
}

/**
 * Resolve all required master data entities for the given project/module scope.
 *
 * For each entry in `requiredMasterData`:
 * - Finds an existing master data tracker matching by key or normalized name
 * - Creates one in the Master Data module if not found
 *
 * Emits a `master_data_progress` event when all entities are resolved.
 * Throws on failure — the caller (orchestrate.ts) treats errors as non-fatal and
 * falls back to PATH B (builder uses __master_data__ placeholder).
 */
export async function runMasterDataAgent(
  requiredMasterData: RequiredMasterDataEntry[],
  write: (event: AgentStreamEvent) => void,
  opts: MasterDataAgentOptions,
): Promise<ResolvedMasterDataEntry[]> {
  const { logContext, userId, projectId, moduleId, scope } = opts
  const total = requiredMasterData.length

  if (logContext) {
    logAiStage(
      logContext,
      'master-data-agent-start',
      `Resolving ${total} master data ${total === 1 ? 'entity' : 'entities'} for scope "${scope}".`,
    )
  }

  try {
    if (!requiredMasterData.length) return []

    const masterDataModule = await findOrCreateMasterDataModule({
      projectId,
      parentModuleId: scope === 'module' ? (moduleId ?? null) : null,
      userId,
    })

    const existingTrackers = await prisma.trackerSchema.findMany({
      where: { projectId, moduleId: masterDataModule.id, type: 'GENERAL' },
      select: { id: true, name: true, schema: true },
    })

    const trackerIndex = existingTrackers.map((t) => {
      const schema = t.schema as Record<string, unknown>
      const meta = readMasterDataMeta(schema) ?? buildMasterDataMeta({ schema })
      return { id: t.id, name: t.name ?? '', normalized: normalizeName(t.name ?? ''), schema, meta }
    })

    const resolved: ResolvedMasterDataEntry[] = []

    for (const entry of requiredMasterData) {
      const key = entry.key.trim()
      const name = entry.name.trim()
      if (!key || !name) continue
      const normalized = normalizeName(name)

      let match = trackerIndex.find(
        (t) => (t.meta?.key && t.meta.key === key) || t.normalized === normalized,
      )

      if (!match) {
        const baseSchema = buildMasterDataSchema(name)
        const schemaWithMeta = withMasterDataMeta({
          schema: { ...baseSchema, masterDataScope: 'tracker' },
          key,
          preferredLabelFieldId: entry.labelFieldId,
        })
        const created = await createTrackerForUser({
          userId,
          name,
          schema: schemaWithMeta as object,
          projectId,
          moduleId: masterDataModule.id,
        })
        const meta =
          readMasterDataMeta(schemaWithMeta) ??
          buildMasterDataMeta({ schema: schemaWithMeta, key, preferredLabelFieldId: entry.labelFieldId })
        match = { id: created.id, name: created.name ?? name, normalized, schema: schemaWithMeta, meta }
        trackerIndex.push(match)
      }

      const fieldsInfo = extractMasterDataFields(match.schema, match.meta?.gridId)
      const labelFieldId = resolveLabelFieldIdFromMeta({
        fieldIds: fieldsInfo.fieldIds,
        fieldIdToLabel: fieldsInfo.fieldIdToLabel,
        preferredId: entry.labelFieldId ?? match.meta?.labelFieldId,
      })
      const gridId = fieldsInfo.gridId ?? resolveMasterDataGridId(match.schema, match.meta?.gridId)
      if (!gridId) continue

      resolved.push({ key, name: match.name || name, trackerId: match.id, gridId, labelFieldId })
    }

    write({
      t: 'master_data_progress',
      resolved: resolved.length,
      total,
      name: resolved.length > 0 ? resolved[resolved.length - 1].name : 'complete',
    })

    if (logContext) {
      logAiStage(
        logContext,
        'master-data-agent-complete',
        `Resolved ${resolved.length}/${total} master data entities.`,
      )
    }

    return resolved
  } catch (err) {
    if (logContext) logAiError(logContext, 'master-data-agent-failed', err)
    throw err
  }
}
