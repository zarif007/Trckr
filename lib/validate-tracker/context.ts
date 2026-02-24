/**
 * Builds a validation context from a tracker so validators can reuse id sets.
 */

import type { TrackerLike, ValidationContext } from './types'

export function buildValidationContext(tracker: TrackerLike): ValidationContext {
  const tabs = tracker.tabs ?? []
  const sections = tracker.sections ?? []
  const grids = tracker.grids ?? []
  const fields = tracker.fields ?? []
  const layoutNodes = tracker.layoutNodes ?? []
  const bindings = tracker.bindings ?? {}
  const validations = tracker.validations ?? {}
  const calculations = tracker.calculations ?? {}

  const gridIds = new Set(grids.map((g) => g.id))
  const fieldIds = new Set(fields.map((f) => f.id))
  const fieldPaths = new Set<string>()
  for (const node of layoutNodes) {
    if (gridIds.has(node.gridId) && fieldIds.has(node.fieldId)) {
      fieldPaths.add(`${node.gridId}.${node.fieldId}`)
    }
  }

  return {
    tabIds: new Set(tabs.map((t) => t.id)),
    sectionIds: new Set(sections.map((s) => s.id)),
    gridIds,
    fieldIds,
    fieldPaths,
    tabs,
    sections,
    grids,
    fields,
    layoutNodes,
    bindings,
    validations,
    calculations,
  }
}
