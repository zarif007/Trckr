/**
 * Validates layout structure: layoutNodes → grids/fields, sections → tabs, grids → sections.
 */

import type { ValidationContext, ValidatorResult } from '../types'

export function validateLayout(ctx: ValidationContext): ValidatorResult {
  const errors: string[] = []

  for (const node of ctx.layoutNodes) {
    if (!ctx.gridIds.has(node.gridId)) {
      errors.push(`layoutNode references missing gridId "${node.gridId}"`)
    }
    if (!ctx.fieldIds.has(node.fieldId)) {
      errors.push(`layoutNode references missing fieldId "${node.fieldId}"`)
    }
  }

  for (const section of ctx.sections) {
    if (!ctx.tabIds.has(section.tabId)) {
      errors.push(`section "${section.id}" references missing tabId "${section.tabId}"`)
    }
  }

  for (const grid of ctx.grids) {
    if (!ctx.sectionIds.has(grid.sectionId)) {
      errors.push(`grid "${grid.id}" references missing sectionId "${grid.sectionId}"`)
    }
  }

  return { errors }
}
