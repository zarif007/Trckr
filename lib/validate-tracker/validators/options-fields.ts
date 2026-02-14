/**
 * Validates that options/multiselect fields have a bindings entry.
 */

import type { ValidationContext, ValidatorResult } from '../types'

export function validateOptionsFields(ctx: ValidationContext): ValidatorResult {
  const warnings: string[] = []

  for (const field of ctx.fields) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue

    const layoutNode = ctx.layoutNodes.find((n) => n.fieldId === field.id)
    const grid = layoutNode ? ctx.grids.find((g) => g.id === layoutNode.gridId) : null
    const fieldPath = grid ? `${grid.id}.${field.id}` : null
    const hasBinding = fieldPath ? ctx.bindings[fieldPath] !== undefined : false

    if (!hasBinding) {
      warnings.push(
        `field "${field.id}" (options/multiselect) has no bindings entry; run buildBindingsFromSchema or ask AI to add bindings`
      )
    }
  }

  return { warnings }
}
