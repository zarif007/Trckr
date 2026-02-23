import { parsePath } from '@/lib/resolve-bindings'
import type { FieldMapping } from '@/lib/types/tracker-bindings'
import type { TrackerGrid, TrackerField, TrackerLayoutNode } from '../types'

export type FieldPathOption = { value: string; label: string }

export type BindingDraft = {
  key: string
  optionsGrid: string
  labelField: string
  fieldMappings: FieldMapping[]
}

export type BindingDraftErrors = {
  key?: string
  optionsGrid?: string
  labelField?: string
  fieldMappings?: string
}

export type BindingValidationContext = {
  existingKeys: Set<string>
  originalKey?: string | null
  gridFieldMap: Map<string, Set<string>>
}

export type SuggestMappingsInput = {
  selectFieldPath: string
  optionsGrid: string
  labelField: string
  existingMappings?: FieldMapping[]
  gridFieldMap: Map<string, Set<string>>
}

export function resolvePathLabel(
  path: string,
  grids: TrackerGrid[],
  fields: TrackerField[]
): string {
  if (!path) return path
  const { gridId, fieldId } = parsePath(path)
  if (!gridId && !fieldId) return path
  const grid = grids.find((g) => g.id === gridId)
  const field = fields.find((f) => f.id === fieldId)
  const gridName = grid?.name ?? gridId ?? ''
  const fieldLabel = field?.ui?.label ?? fieldId ?? ''
  if (gridName && fieldLabel) return `${gridName} → ${fieldLabel}`
  return fieldLabel || gridName || path
}

export function buildFieldPathOptions(
  layoutNodes: TrackerLayoutNode[],
  grids: TrackerGrid[],
  fields: TrackerField[],
  filter?: (args: {
    node: TrackerLayoutNode
    grid: TrackerGrid
    field: TrackerField
  }) => boolean
): FieldPathOption[] {
  if (!layoutNodes?.length) return []
  const gridMap = new Map(grids.map((g) => [g.id, g]))
  const fieldMap = new Map(fields.map((f) => [f.id, f]))
  const seen = new Set<string>()
  const options: FieldPathOption[] = []

  for (const node of layoutNodes) {
    const grid = gridMap.get(node.gridId)
    const field = fieldMap.get(node.fieldId)
    if (!grid || !field) continue
    if ((field.config as { isHidden?: boolean } | undefined)?.isHidden) continue
    if (filter && !filter({ node, grid, field })) continue

    const value = `${node.gridId}.${node.fieldId}`
    if (seen.has(value)) continue
    seen.add(value)
    options.push({
      value,
      label: `${grid.name ?? grid.id} → ${field.ui?.label ?? field.id}`,
    })
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
}

export function buildPathLabelMap(
  layoutNodes: TrackerLayoutNode[],
  grids: TrackerGrid[],
  fields: TrackerField[]
): Map<string, string> {
  const options = buildFieldPathOptions(layoutNodes, grids, fields)
  return new Map(options.map((opt) => [opt.value, opt.label]))
}

export function buildOptionsGridOptions(grids: TrackerGrid[]): FieldPathOption[] {
  return (grids ?? [])
    .filter((g) => g.id.endsWith('_options_grid'))
    .map((g) => ({ value: g.id, label: g.name ?? g.id }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function buildGridFieldMap(layoutNodes: TrackerLayoutNode[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const node of layoutNodes ?? []) {
    if (!node.gridId || !node.fieldId) continue
    const set = map.get(node.gridId) ?? new Set<string>()
    set.add(node.fieldId)
    map.set(node.gridId, set)
  }
  return map
}

export function normalizeMappings(raw: FieldMapping[] | undefined | null): FieldMapping[] {
  if (!Array.isArray(raw)) return []
  const out: FieldMapping[] = []
  const seen = new Set<string>()
  for (const mapping of raw) {
    if (!mapping || typeof mapping !== 'object') continue
    const from = typeof mapping.from === 'string' ? mapping.from.trim() : ''
    const to = typeof mapping.to === 'string' ? mapping.to.trim() : ''
    if (!from || !to) continue
    const key = `${from}\t${to}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ from, to })
  }
  return out
}

export function ensureValueMapping(
  mappings: FieldMapping[],
  labelField: string,
  selectFieldPath: string
): FieldMapping[] {
  const from = labelField.trim()
  const to = selectFieldPath.trim()
  if (!from || !to) return mappings
  const has = mappings.some((m) => m.from === from && m.to === to)
  if (has) return mappings
  return [{ from, to }, ...mappings]
}

export function validateBindingDraft(
  draft: BindingDraft,
  context: BindingValidationContext
): { isValid: boolean; errors: BindingDraftErrors } {
  const errors: BindingDraftErrors = {}
  const key = draft.key.trim()
  const optionsGrid = draft.optionsGrid.trim()
  const labelField = draft.labelField.trim()

  if (!key) {
    errors.key = 'Select field is required.'
  } else if (context.existingKeys.has(key) && key !== context.originalKey) {
    errors.key = 'This select field already has a binding.'
  } else {
    const parsedKey = parsePath(key)
    if (!parsedKey.fieldId) {
      errors.key = 'Select field must be a grid.field path.'
    }
  }

  if (!optionsGrid) {
    errors.optionsGrid = 'Options grid is required.'
  }

  if (!labelField) {
    errors.labelField = 'Label field is required.'
  } else if (optionsGrid) {
    const parsed = parsePath(labelField)
    if (!parsed.fieldId) {
      errors.labelField = 'Label field must be a grid.field path.'
    } else if (parsed.gridId && parsed.gridId !== optionsGrid) {
      errors.labelField = 'Label field must be in the selected options grid.'
    } else if (parsed.fieldId) {
      const gridFields = context.gridFieldMap.get(optionsGrid)
      if (gridFields && !gridFields.has(parsed.fieldId)) {
        errors.labelField = 'Label field does not exist in the selected options grid.'
      }
    }
  }

  const mappings = normalizeMappings(draft.fieldMappings)
  const selectGridId = key ? parsePath(key).gridId ?? key.split('.')[0] : undefined
  const optionsFieldIds = optionsGrid ? context.gridFieldMap.get(optionsGrid) : undefined
  const mainFieldIds = selectGridId ? context.gridFieldMap.get(selectGridId) : undefined

  if (mappings.length > 0 && (optionsFieldIds || mainFieldIds)) {
    for (const mapping of mappings) {
      const fromParsed = parsePath(mapping.from)
      const toParsed = parsePath(mapping.to)
      if (optionsFieldIds) {
        if (fromParsed.gridId && fromParsed.gridId !== optionsGrid) {
          errors.fieldMappings = 'Mapping sources must be from the options grid.'
          break
        }
        if (fromParsed.fieldId && !optionsFieldIds.has(fromParsed.fieldId)) {
          errors.fieldMappings = 'Mapping sources must be from the options grid.'
          break
        }
      }
      if (mainFieldIds) {
        if (toParsed.gridId && selectGridId && toParsed.gridId !== selectGridId) {
          errors.fieldMappings = 'Mapping targets must be from the select field grid.'
          break
        }
        if (toParsed.fieldId && !mainFieldIds.has(toParsed.fieldId)) {
          errors.fieldMappings = 'Mapping targets must be from the select field grid.'
          break
        }
      }
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors }
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

export function suggestFieldMappings(input: SuggestMappingsInput): FieldMapping[] {
  const {
    selectFieldPath,
    optionsGrid,
    labelField,
    existingMappings = [],
    gridFieldMap,
  } = input
  if (!selectFieldPath) return []
  const selectParsed = parsePath(selectFieldPath)
  const selectGridId = selectParsed.gridId
  const selectFieldId = selectParsed.fieldId ?? ''
  if (!selectGridId || !optionsGrid) return []

  const optionFields = Array.from(gridFieldMap.get(optionsGrid) ?? [])
  const mainFields = Array.from(gridFieldMap.get(selectGridId) ?? [])
  if (optionFields.length === 0 || mainFields.length === 0) return []

  const labelFieldId = labelField ? parsePath(labelField).fieldId : null
  const existingSet = new Set(existingMappings.map((m) => `${m.from}\t${m.to}`))
  const mappedTargets = new Set(existingMappings.map((m) => m.to))
  const reserved = new Set([labelFieldId].filter(Boolean) as string[])

  const suggestions: FieldMapping[] = []
  const addMapping = (fromFieldId: string, toFieldId: string) => {
    const from = `${optionsGrid}.${fromFieldId}`
    const to = `${selectGridId}.${toFieldId}`
    const key = `${from}\t${to}`
    if (existingSet.has(key) || mappedTargets.has(to)) return
    suggestions.push({ from, to })
    existingSet.add(key)
    mappedTargets.add(to)
  }

  for (const optFieldId of optionFields) {
    if (reserved.has(optFieldId)) continue

    if (mainFields.includes(optFieldId)) {
      addMapping(optFieldId, optFieldId)
      continue
    }

    for (const mainFieldId of mainFields) {
      if (optFieldId === `${selectFieldId}_${mainFieldId}`) {
        addMapping(optFieldId, mainFieldId)
        break
      }
    }

    for (const mainFieldId of mainFields) {
      if (optFieldId.endsWith(`_${mainFieldId}`)) {
        addMapping(optFieldId, mainFieldId)
        break
      }
    }

    const optCore = extractCoreName(optFieldId)
    for (const mainFieldId of mainFields) {
      const mainCore = extractCoreName(mainFieldId)
      if (optCore === mainCore && optCore.length >= 3) {
        addMapping(optFieldId, mainFieldId)
        break
      }
    }
  }

  return suggestions
}
