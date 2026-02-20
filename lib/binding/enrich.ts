/**
 * Enrich bindings by inferring fieldMappings from option-grid and main-grid field ids.
 * Does not remove existing mappings. Uses multiple matching strategies.
 */

import type { TrackerLike } from './types'
import { normalizeOptionsGridId } from '@/lib/resolve-bindings'

/** Parse "grid_id.field_id" and return the field id (last part). */
function parsePathFieldId(path: string): string | null {
  if (!path || typeof path !== 'string') return null
  const parts = path.split('.')
  return parts.length >= 2 ? parts[1]! : parts[0] ?? null
}

function getFieldIdsInGrid(
  gridId: string,
  layoutNodes: Array<{ gridId: string; fieldId: string }>
): string[] {
  return layoutNodes
    .filter((n) => n.gridId === gridId)
    .map((n) => n.fieldId)
    .filter((id): id is string => typeof id === 'string')
}

function extractCoreName(fieldId: string): string {
  let core = fieldId
  const prefixes = ['opt_', 'option_', 'item_', 'product_', 'unit_', 'total_', 'base_']
  for (const prefix of prefixes) {
    if (core.startsWith(prefix)) {
      core = core.slice(prefix.length)
      break
    }
  }
  const suffixes = ['_value', '_amount', '_val', '_opt', '_option', '_item', '_total', '_base']
  for (const suffix of suffixes) {
    if (core.endsWith(suffix)) {
      core = core.slice(0, -suffix.length)
      break
    }
  }
  return core
}

/**
 * Enrich bindings by inferring fieldMappings: for each binding, add mappings from
 * option-grid fields to main-grid fields. Does not remove existing mappings.
 *
 * Matching order:
 * 1. Exact: option field id === main field id
 * 2. Prefix: optFieldId === selectFieldId_mainFieldId
 * 3. Suffix: optFieldId ends with _mainFieldId
 * 4. Core name: strip prefixes/suffixes and match (min 3 chars)
 */
export function enrichBindingsFromSchema<T extends TrackerLike>(tracker: T): T {
  if (!tracker?.bindings || !tracker?.layoutNodes?.length) return tracker

  const layoutNodes = tracker.layoutNodes
  const bindings = { ...tracker.bindings }

  let anyChanged = false
  for (const [fieldPath, entry] of Object.entries(bindings)) {
    const parts = fieldPath.split('.')
    if (parts.length < 2) continue
    const mainGridId = parts[0]!
    const selectFieldId = parts[1]!

    const optionsGridId = normalizeOptionsGridId(entry.optionsGrid)
    if (!optionsGridId) continue

    const optionFieldIds = getFieldIdsInGrid(optionsGridId, layoutNodes)
    const mainFieldIds = getFieldIdsInGrid(mainGridId, layoutNodes)
    const mainFieldIdSet = new Set(mainFieldIds)

    const labelFieldId = parsePathFieldId(entry.labelField)
    const valueMapping = (entry.fieldMappings ?? []).find((m) => m.to === fieldPath)
    const valueFieldId = valueMapping ? parsePathFieldId(valueMapping.from) : labelFieldId
    const reserved = new Set([labelFieldId, valueFieldId].filter(Boolean) as string[])

    const existingMappings = new Set(
      (entry.fieldMappings ?? []).map((m) => `${m.from}\t${m.to}`)
    )
    const mappedTargets = new Set((entry.fieldMappings ?? []).map((m) => m.to))
    const newMappings: Array<{ from: string; to: string }> = [...(entry.fieldMappings ?? [])]
    let entryChanged = false

    const addIfNew = (from: string, to: string) => {
      if (existingMappings.has(`${from}\t${to}`)) return
      if (mappedTargets.has(to)) return
      newMappings.push({ from, to })
      existingMappings.add(`${from}\t${to}`)
      mappedTargets.add(to)
      entryChanged = true
    }

    for (const optFieldId of optionFieldIds) {
      if (reserved.has(optFieldId)) continue
      const from = `${optionsGridId}.${optFieldId}`

      if (mainFieldIdSet.has(optFieldId)) {
        addIfNew(from, `${mainGridId}.${optFieldId}`)
        continue
      }

      for (const mainFieldId of mainFieldIds) {
        if (optFieldId === `${selectFieldId}_${mainFieldId}`) {
          addIfNew(from, `${mainGridId}.${mainFieldId}`)
          break
        }
      }

      for (const mainFieldId of mainFieldIds) {
        if (optFieldId.endsWith(`_${mainFieldId}`)) {
          addIfNew(from, `${mainGridId}.${mainFieldId}`)
          break
        }
      }

      const optCore = extractCoreName(optFieldId)
      for (const mainFieldId of mainFieldIds) {
        const mainCore = extractCoreName(mainFieldId)
        if (optCore === mainCore && optCore.length >= 3) {
          addIfNew(from, `${mainGridId}.${mainFieldId}`)
          break
        }
      }
    }

    if (entryChanged) {
      bindings[fieldPath] = { ...entry, fieldMappings: newMappings }
      anyChanged = true
    }
  }

  if (!anyChanged) return tracker
  return { ...tracker, bindings } as T
}
