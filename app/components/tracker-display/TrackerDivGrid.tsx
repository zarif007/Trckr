import { useState, useRef, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MultiSelect } from '@/components/ui/multi-select'
import type { TrackerContextForOptions } from '@/lib/resolve-options'
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from './types'
import { resolveFieldOptionsV2 } from '@/lib/resolve-options'
import { getBindingForField, findOptionRow, applyBindings, parsePath, getValueFieldIdFromBinding } from '@/lib/resolve-bindings'
import { applyFieldOverrides, buildDependsOnIndex, getRulesForGrid, resolveDependsOnOverrides } from '@/lib/depends-on'
import type { OptionsGridFieldDef } from '@/components/ui/data-table/utils'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import { EntryFormDialog } from '@/components/ui/data-table/entry-form-dialog'
import { resolveDivStyles } from '@/lib/style-utils'

const ADD_OPTION_VALUE = '__add_option__'

interface TrackerDivGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  /** All layout nodes (all grids). Used to resolve options grid fields for Add Option. */
  allLayoutNodes?: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  /** Optional style overrides for this div view. */
  styleOverrides?: StyleOverrides
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onCrossGridUpdate?: (gridId: string, rowIndex: number, fieldId: string, value: unknown) => void
  /** Add a row to any grid (e.g. options grid). Used for "Add option" in select/multiselect. */
  onAddEntryToGrid?: (gridId: string, newRow: Record<string, unknown>) => void
  /** For dynamic_select/dynamic_multiselect option resolution (e.g. all_field_paths). */
  trackerContext?: TrackerContextForOptions
}

export function TrackerDivGrid({
  tabId,
  grid,
  layoutNodes,
  allLayoutNodes,
  fields,
  bindings = {},
  styleOverrides,
  dependsOn,
  gridData = {},
  onUpdate,
  onCrossGridUpdate,
  onAddEntryToGrid,
  trackerContext,
}: TrackerDivGridProps) {
  const ds = useMemo(() => resolveDivStyles(styleOverrides), [styleOverrides])
  const dependsOnIndex = useMemo(() => buildDependsOnIndex(dependsOn ?? []), [dependsOn])
  const dependsOnForGrid = useMemo(
    () => getRulesForGrid(dependsOnIndex, grid.id),
    [dependsOnIndex, grid.id]
  )
  const fieldNodes = layoutNodes.filter((n) => n.gridId === grid.id).sort((a, b) => a.order - b.order)

  const [addOptionOpen, setAddOptionOpen] = useState(false)
  const [addOptionContext, setAddOptionContext] = useState<{
    fieldId: string
    onAddOption: (row: Record<string, unknown>) => string
    isMultiselect: boolean
    currentValue: unknown
    optionsGridFields: OptionsGridFieldDef[]
  } | null>(null)

  const addOptionFieldMetadata: FieldMetadata = useMemo(() => {
    const meta: FieldMetadata = {}
    addOptionContext?.optionsGridFields?.forEach((f) => {
      meta[f.id] = { name: f.label, type: f.type, config: f.config }
    })
    return meta
  }, [addOptionContext?.optionsGridFields])

  const addOptionFieldOrder = useMemo(
    () => addOptionContext?.optionsGridFields?.map((f) => f.id) ?? [],
    [addOptionContext?.optionsGridFields]
  )

  const initialOptionValues = useMemo(() => {
    const initial: Record<string, unknown> = {}
    addOptionContext?.optionsGridFields?.forEach((f) => {
      initial[f.id] = f.type === 'number' ? '' : f.type === 'boolean' ? false : ''
    })
    return initial
  }, [addOptionContext?.optionsGridFields])

  const applyAddOption = (values: Record<string, unknown>) => {
    if (!addOptionContext) return
    const normalized = { ...values }
    addOptionContext.optionsGridFields.forEach((f) => {
      if (normalized[f.id] === '' && (f.type === 'number' || f.type === 'string')) {
        normalized[f.id] = f.type === 'number' ? undefined : ''
      }
    })
    const newValue = addOptionContext.onAddOption(normalized)
    if (addOptionContext.isMultiselect) {
      const currentVal = data[addOptionContext.fieldId]
      const current = Array.isArray(currentVal) ? currentVal : []
      onUpdate?.(0, addOptionContext.fieldId, [...current.map(String), newValue])
    } else {
      onUpdate?.(0, addOptionContext.fieldId, newValue)
    }
  }

  const data = gridData?.[grid.id]?.[0] || {}
  const fieldOverrides = useMemo(
    () => resolveDependsOnOverrides(dependsOnForGrid, gridData, grid.id, 0, data),
    [dependsOnForGrid, gridData, grid.id, data]
  )

  if (fieldNodes.length === 0) return null

  const isVertical = grid.config?.layout === 'vertical'

  return (
    <div className={`grid gap-4 ${isVertical ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
      {fieldNodes.map((node) => {
        const field = fields.find(f => f.id === node.fieldId)
        if (!field) return null
        const effectiveConfig = applyFieldOverrides(field.config, fieldOverrides[field.id])
        if (effectiveConfig?.isHidden) return null

        const options = (field.dataType === 'options' || field.dataType === 'multiselect' || field.dataType === 'dynamic_select' || field.dataType === 'dynamic_multiselect')
          ? resolveFieldOptionsV2(tabId, grid.id, field, bindings, gridData, trackerContext)
          : undefined

        const binding = (field.dataType === 'options' || field.dataType === 'multiselect') && onAddEntryToGrid
          ? getBindingForField(grid.id, field.id, bindings, tabId)
          : undefined
        const selectFieldPath = `${grid.id}.${field.id}`
        let optionsGridFields: OptionsGridFieldDef[] = []
        let onAddOption: ((row: Record<string, unknown>) => string) | undefined
        if (binding && onAddEntryToGrid) {
          const optionsGridId = binding.optionsGrid?.includes('.') ? binding.optionsGrid.split('.').pop()! : binding.optionsGrid
          const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)
          const { fieldId: labelFieldId } = parsePath(binding.labelField)
          const allNodes = allLayoutNodes ?? layoutNodes
          const optionLayoutNodes = allNodes.filter((n) => n.gridId === (optionsGridId ?? '')).sort((a, b) => a.order - b.order)
          optionsGridFields = optionLayoutNodes
            .map((n) => fields.find((f) => f.id === n.fieldId))
            .filter((f): f is NonNullable<typeof f> => !!f && !f.config?.isHidden)
            .map((f) => ({
              id: f.id,
              label: f.ui.label,
              type: f.dataType as OptionsGridFieldDef['type'],
              config: f.config as OptionsGridFieldDef['config'],
            }))
          onAddOption = (row: Record<string, unknown>) => {
            onAddEntryToGrid!(optionsGridId!, row)
            const val = row[valueFieldId ?? '']
            const label = labelFieldId ? row[labelFieldId] : undefined
            return String(val ?? label ?? '')
          }
        }

        const rawValue = data[field.id]
        const value = (effectiveConfig && 'value' in effectiveConfig && (effectiveConfig as { value?: unknown }).value !== undefined)
          ? (effectiveConfig as { value: unknown }).value
          : rawValue
        const valueString = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
        const isDisabled = !!effectiveConfig?.isDisabled || (effectiveConfig && 'value' in effectiveConfig && (effectiveConfig as { value?: unknown }).value !== undefined)

        const handleSelectChange = (selectedValue: unknown) => {
          onUpdate?.(0, field.id, selectedValue)

          if (field.dataType === 'options' || field.dataType === 'multiselect') {
            const binding = getBindingForField(grid.id, field.id, bindings, tabId)
            if (binding && binding.fieldMappings.length > 0) {
              const selectFieldPath = `${grid.id}.${field.id}`
              const optionRow = findOptionRow(gridData, binding, selectedValue, selectFieldPath)
              if (optionRow) {
                const updates = applyBindings(binding, optionRow, selectFieldPath)
                for (const update of updates) {
                  const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(update.targetPath)
                  if (targetGridId && targetFieldId) {
                    if (onCrossGridUpdate) {
                      onCrossGridUpdate(targetGridId, 0, targetFieldId, update.value)
                    } else if (targetGridId === grid.id) {
                      onUpdate?.(0, targetFieldId, update.value)
                    }
                  }
                }
              }
            }
          }
        }

        const inputTextClass = `${ds.fontSize} ${ds.fontWeight} ${ds.textColor}`.trim()
        const renderInput = () => {
          switch (field.dataType) {
            case 'text':
              return (
                <Textarea
                  className={`min-h-[100px] leading-7 text-foreground/90 border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
                  defaultValue={valueString}
                  disabled={isDisabled}
                  onBlur={(e) =>
                    onUpdate?.(0, field.id, e.target.value)
                  }
                />
              )
            case 'boolean':
              return (
                <div className="flex items-center min-h-[2.5rem]">
                  <Checkbox
                    checked={value === true}
                    disabled={isDisabled}
                    onCheckedChange={(checked) =>
                      onUpdate?.(0, field.id, checked)
                    }
                  />
                </div>
              )
            case 'options': {
              const opts = options ?? []
              const toItemValue = (v: unknown) => {
                const s = String(v ?? '').trim()
                return s === '' ? '__empty__' : s
              }
              const selectOptions = opts.map((option) => {
                const itemValue = toItemValue(option.value ?? option.id ?? option.label)
                return { value: itemValue, label: option.label }
              })
              return (
                <SearchableSelect
                  options={selectOptions}
                  value={typeof value === 'string' && value.trim() !== '' ? value : '__empty__'}
                  disabled={isDisabled}
                  onValueChange={(val) => {
                    if (val === ADD_OPTION_VALUE && onAddOption) {
                      setAddOptionContext({ fieldId: field.id, onAddOption, isMultiselect: false, currentValue: value, optionsGridFields })
                      setAddOptionOpen(true)
                      return
                    }
                    handleSelectChange(val === '__empty__' ? '' : val)
                  }}
                  searchPlaceholder=""
                  className={`w-full border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
                  onAddOptionClick={onAddOption ? () => {
                    setAddOptionContext({ fieldId: field.id, onAddOption, isMultiselect: false, currentValue: value, optionsGridFields })
                    setAddOptionOpen(true)
                  } : undefined}
                  addOptionLabel="Add option..."
                />
              )
            }
            case 'multiselect': {
              const opts = options ?? []
              const multiOpts = opts.map(o => ({ label: o.label, id: String(o.value ?? o.id ?? o.label) }))
              return (
                <MultiSelect
                  options={multiOpts}
                  value={Array.isArray(value) ? value.map(String) : []}
                  onChange={(val) => handleSelectChange(val)}
                  disabled={isDisabled}
                  className={`w-full border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
                  onAddOptionClick={onAddOption ? () => {
                    setAddOptionContext({ fieldId: field.id, onAddOption, isMultiselect: true, currentValue: value, optionsGridFields })
                    setAddOptionOpen(true)
                  } : undefined}
                />
              )
            }
            case 'date':
              return (
                <Input
                  type="date"
                  className={`border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
                  defaultValue={
                    value
                      ? new Date(String(value)).toISOString().split('T')[0]
                      : undefined
                  }
                  disabled={isDisabled}
                  onBlur={(e) =>
                    onUpdate?.(0, field.id, e.target.value)
                  }
                />
              )
            case 'number':
              return (
                <Input
                  type="number"
                  className={`border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
                  defaultValue={typeof value === 'number' ? value : valueString}
                  disabled={isDisabled}
                  onBlur={(e) =>
                    onUpdate?.(0, field.id, Number(e.target.value))
                  }
                />
              )
            default:
              return (
                <Input
                  className={`border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
                  defaultValue={valueString}
                  disabled={isDisabled}
                  onBlur={(e) =>
                    onUpdate?.(0, field.id, e.target.value)
                  }
                />
              )
          }
        }

        return (
          <div key={field.id} className="space-y-1.5">
            <label className={`${ds.labelFontSize} font-medium text-muted-foreground uppercase tracking-wider ${ds.fontWeight}`}>
              {field.ui.label}
              {effectiveConfig?.isRequired && (
                <span className="text-destructive/80 ml-1">*</span>
              )}
            </label>
            <div className={`rounded-md border border-input hover:border-ring transition-[color,box-shadow] ${ds.fontSize} ${field.dataType === 'text' ? 'h-auto' : ''}`}>
              {renderInput()}
            </div>
          </div>
        )
      })}
      {onAddEntryToGrid && addOptionContext && addOptionContext.optionsGridFields.length > 0 && (
        <EntryFormDialog
          open={addOptionOpen}
          onOpenChange={(open) => {
            setAddOptionOpen(open)
            if (!open) setAddOptionContext(null)
          }}
          title="Add option"
          submitLabel="Add"
          fieldMetadata={addOptionFieldMetadata}
          fieldOrder={addOptionFieldOrder}
          initialValues={initialOptionValues}
          onSave={applyAddOption}
          onSaveAnother={applyAddOption}
          mode="add"
        />
      )}
    </div>
  )
}
