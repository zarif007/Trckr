import type { TrackerDisplayProps, TrackerLayoutNode } from '@/app/components/tracker-display/types'
import type { TrackerPatchSchema } from '@/lib/schemas/multi-agent'

type PatchItem<T> = Partial<T> & { id?: string; _delete?: boolean }
type LayoutNodePatch = Partial<TrackerLayoutNode> & { gridId?: string; fieldId?: string; _delete?: boolean }

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const mergeWithNested = <T extends Record<string, unknown>>(
  base: T,
  patch: Partial<T>,
  nestedKeys: Array<keyof T>,
): T => {
  const merged = { ...base, ...patch } as T

  for (const key of nestedKeys) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    const patchValue = patch[key]
    if (isPlainObject(patchValue)) {
      const baseValue = isPlainObject(base[key]) ? base[key] : {}
      merged[key] = { ...baseValue, ...patchValue } as T[keyof T]
    }
  }

  return merged
}

/** Patch items from schema may have looser types (e.g. string vs TrackerFieldType); we accept them for merging. */
type MergeablePatch = { id?: string; _delete?: boolean } & Record<string, unknown>

const mergeArrayById = <T extends { id: string }>(
  base: T[],
  patch: Array<MergeablePatch> | undefined,
  nestedKeys: Array<keyof T> = [],
): T[] => {
  if (!patch?.length) return base

  let next = [...base]

  for (const item of patch) {
    const id = item.id
    if (!id) continue
    if (item._delete) {
      next = next.filter((entry) => entry.id !== id)
      continue
    }

    const { _delete, ...patchData } = item
    const existingIndex = next.findIndex((entry) => entry.id === id)
    if (existingIndex >= 0) {
      next[existingIndex] = mergeWithNested(next[existingIndex], patchData as Partial<T>, nestedKeys)
    } else {
      next = [...next, patchData as T]
    }
  }

  return next
}

const layoutNodeKey = (node: { gridId?: string; fieldId?: string }) =>
  `${node.gridId ?? ''}::${node.fieldId ?? ''}`

const mergeLayoutNodes = (
  base: TrackerLayoutNode[],
  patch: Array<LayoutNodePatch> | undefined,
): TrackerLayoutNode[] => {
  if (!patch?.length) return base

  let next = [...base]

  for (const item of patch) {
    const gridId = item.gridId
    const fieldId = item.fieldId
    if (!gridId || !fieldId) continue

    if (item._delete) {
      next = next.filter((node) => layoutNodeKey(node) !== layoutNodeKey(item))
      continue
    }

    const { _delete, ...patchData } = item
    const existingIndex = next.findIndex((node) => layoutNodeKey(node) === layoutNodeKey(item))
    if (existingIndex >= 0) {
      next[existingIndex] = { ...next[existingIndex], ...patchData }
    } else {
      next = [...next, patchData as TrackerLayoutNode]
    }
  }

  return next
}

export function applyTrackerPatch(
  base: TrackerDisplayProps,
  patch: TrackerPatchSchema,
): TrackerDisplayProps {
  const tabs = mergeArrayById(base.tabs ?? [], patch.tabs, ['config'])
  const sections = mergeArrayById(base.sections ?? [], patch.sections, ['config'])
  const grids = mergeArrayById(base.grids ?? [], patch.grids, ['config'])
  const fields = mergeArrayById(base.fields ?? [], patch.fields, ['config', 'ui'])
  let layoutNodes = mergeLayoutNodes(base.layoutNodes ?? [], patch.layoutNodes)

  const gridIds = new Set(grids.map((grid) => grid.id))
  const fieldIds = new Set(fields.map((field) => field.id))
  layoutNodes = layoutNodes.filter(
    (node) => gridIds.has(node.gridId) && fieldIds.has(node.fieldId),
  )

  const bindings = { ...(base.bindings ?? {}) }
  if (patch.bindings) {
    for (const [key, value] of Object.entries(patch.bindings)) {
      if (value === null) {
        delete bindings[key]
      } else {
        bindings[key] = value as any
      }
    }
  }
  if (patch.bindingsRemove) {
    for (const key of patch.bindingsRemove) {
      delete bindings[key]
    }
  }
  for (const key of Object.keys(bindings)) {
    const [gridId, fieldId] = key.split('.')
    if (!gridId || !fieldId || !gridIds.has(gridId) || !fieldIds.has(fieldId)) {
      delete bindings[key]
    }
  }

  const validations = { ...(base.validations ?? {}) } as Record<string, unknown>
  if (patch.validations) {
    for (const [key, value] of Object.entries(patch.validations)) {
      if (value === null) {
        delete validations[key]
      } else {
        validations[key] = value as any
      }
    }
  }
  if (patch.validationsRemove) {
    for (const key of patch.validationsRemove) {
      delete validations[key]
    }
  }
  for (const key of Object.keys(validations)) {
    if (!fieldIds.has(key)) delete validations[key]
  }

  // --- Styles ---
  const styles = { ...(base.styles ?? {}) }
  if (patch.styles) {
    for (const [key, value] of Object.entries(patch.styles)) {
      if (value === null) {
        delete styles[key]
      } else if (isPlainObject(value)) {
        const existing = isPlainObject(styles[key]) ? styles[key] : {}
        styles[key] = { ...existing, ...value }
      } else {
        styles[key] = value as any
      }
    }
  }
  if (patch.stylesRemove) {
    for (const key of patch.stylesRemove) {
      delete styles[key]
    }
  }

  return {
    ...base,
    tabs,
    sections,
    grids,
    fields,
    layoutNodes,
    bindings,
    validations,
    dependsOn: patch.dependsOn ?? base.dependsOn,
    styles,
  }
}
