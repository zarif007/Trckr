/**
 * Validates binding entries and ensures select/multiselect fields have bindings.
 * Returns warnings only; invalid bindings are skipped at runtime.
 */

import { parsePath } from '@/lib/resolve-bindings'
import { KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS } from '@/lib/dynamic-options'
import type { ValidationContext, ValidatorResult } from '../types'

function getFieldGridInfo(
  ctx: ValidationContext,
  fieldId: string
): { tabId: string; gridId: string } | null {
  const layoutNode = ctx.layoutNodes.find((n) => n.fieldId === fieldId)
  if (!layoutNode) return null
  const grid = ctx.grids.find((g) => g.id === layoutNode.gridId)
  if (!grid) return null
  const section = ctx.sections.find((s) => s.id === grid.sectionId)
  if (!section) return null
  return { tabId: section.tabId, gridId: grid.id }
}

export function validateBindings(ctx: ValidationContext): ValidatorResult {
  const warnings: string[] = []

  for (const [fieldPath, entry] of Object.entries(ctx.bindings)) {
    const { gridId, fieldId } = parsePath(fieldPath)

    if (!gridId || !ctx.gridIds.has(gridId)) {
      warnings.push(`Binding key "${fieldPath}": grid "${gridId}" not found`)
    }
    if (!fieldId || !ctx.fieldIds.has(fieldId)) {
      warnings.push(`Binding key "${fieldPath}": field "${fieldId}" not found`)
    }

    const optGridId = entry.optionsGrid?.includes('.')
      ? entry.optionsGrid.split('.').pop()!
      : entry.optionsGrid
    if (!optGridId || !ctx.gridIds.has(optGridId)) {
      warnings.push(`Binding "${fieldPath}": optionsGrid "${entry.optionsGrid}" not found`)
    } else if (!optGridId.endsWith('_options_grid')) {
      warnings.push(
        `Binding "${fieldPath}": optionsGrid "${entry.optionsGrid}" should be an options grid (id ending with _options_grid), not a main data grid`
      )
    }

    const labelParsed = parsePath(entry.labelField)
    if (!labelParsed.fieldId || !ctx.fieldIds.has(labelParsed.fieldId)) {
      warnings.push(`Binding "${fieldPath}": labelField "${entry.labelField}" not found`)
    }

    const valueMapping = (entry.fieldMappings ?? []).find((m) => m.to === fieldPath)
    if (!valueMapping) {
      warnings.push(
        `Binding "${fieldPath}": fieldMappings must include one entry where "to" is "${fieldPath}" (the stored value)`
      )
    }

    for (const mapping of entry.fieldMappings ?? []) {
      const fromParsed = parsePath(mapping.from)
      const toParsed = parsePath(mapping.to)
      if (!fromParsed.fieldId || !ctx.fieldIds.has(fromParsed.fieldId)) {
        warnings.push(`Binding "${fieldPath}": source field "${mapping.from}" not found`)
      }
      if (!toParsed.fieldId || !ctx.fieldIds.has(toParsed.fieldId)) {
        warnings.push(`Binding "${fieldPath}": target field "${mapping.to}" not found`)
      }
    }
  }

  for (const field of ctx.fields) {
    if (field.dataType === 'dynamic_select' || field.dataType === 'dynamic_multiselect') {
      const functionId = (field.config as { dynamicOptionsFunction?: string } | undefined)
        ?.dynamicOptionsFunction
      if (
        functionId &&
        !(KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS as readonly string[]).includes(functionId)
      ) {
        warnings.push(
          `Dynamic select field "${field.id}" uses unknown dynamicOptionsFunction "${functionId}"`
        )
      }
      continue
    }
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue

    const gridInfo = getFieldGridInfo(ctx, field.id)
    if (!gridInfo) continue

    const fieldPath = `${gridInfo.gridId}.${field.id}`
    if (ctx.bindings[fieldPath] === undefined) {
      warnings.push(`Select field "${fieldPath}" has no bindings entry`)
    }
  }

  return { warnings }
}
