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

  return {
    tabIds: new Set(tabs.map((t) => t.id)),
    sectionIds: new Set(sections.map((s) => s.id)),
    gridIds: new Set(grids.map((g) => g.id)),
    fieldIds: new Set(fields.map((f) => f.id)),
    tabs,
    sections,
    grids,
    fields,
    layoutNodes,
    bindings,
  }
}
