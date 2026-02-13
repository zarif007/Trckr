/**
 * Dynamic options: all field paths (gridId.fieldId) that actually exist in the layout,
 * with labels "Grid name → Field label". Only includes (grid, field) pairs from layoutNodes.
 * Excludes fields on the Shared tab when sections context is provided.
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

const SHARED_TAB_ID = 'shared_tab'

export const ID = 'all_field_paths'

export function allFieldPaths(context: DynamicOptionsContext): DynamicOption[] {
  const { grids, fields, layoutNodes, sections } = context
  const gridMap = new Map(grids.map((g) => [g.id, g]))
  const fieldMap = new Map(fields.map((f) => [f.id, f]))

  const sharedSectionIds = sections?.length
    ? new Set(sections.filter((s) => s.tabId === SHARED_TAB_ID).map((s) => s.id))
    : undefined

  const nodes = layoutNodes?.length ? layoutNodes : []
  const options: DynamicOption[] = []
  for (const node of nodes) {
    const grid = gridMap.get(node.gridId)
    const field = fieldMap.get(node.fieldId)
    if (!grid || !field) continue
    if ((field.config as { isHidden?: boolean } | undefined)?.isHidden) continue
    if (sharedSectionIds?.has(grid.sectionId)) continue

    const path = `${node.gridId}.${node.fieldId}`
    options.push({
      value: path,
      label: `${grid.name ?? grid.id} → ${field.ui?.label ?? field.id}`,
      id: path,
    })
  }
  return options
}
