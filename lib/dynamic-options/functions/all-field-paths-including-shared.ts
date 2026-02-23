/**
 * Dynamic options: all field paths (gridId.fieldId) that exist in the layout,
 * including fields on the Shared tab. Same as all_field_paths but does not exclude Shared tab sections.
 * Used e.g. by the Bindings grid for label field and mappings (option grids live on Shared tab).
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_field_paths_including_shared'

export function allFieldPathsIncludingShared(context: DynamicOptionsContext): DynamicOption[] {
  const { grids, fields, layoutNodes } = context
  const gridMap = new Map(grids.map((g) => [g.id, g]))
  const fieldMap = new Map(fields.map((f) => [f.id, f]))

  const nodes = layoutNodes?.length ? layoutNodes : []
  const options: DynamicOption[] = []
  for (const node of nodes) {
    const grid = gridMap.get(node.gridId)
    const field = fieldMap.get(node.fieldId)
    if (!grid || !field) continue
    if ((field.config as { isHidden?: boolean } | undefined)?.isHidden) continue

    const path = `${node.gridId}.${node.fieldId}`
    options.push({
      value: path,
      label: `${grid.name ?? grid.id} → ${field.ui?.label ?? field.id}`,
      id: path,
    })
  }
  return options
}
