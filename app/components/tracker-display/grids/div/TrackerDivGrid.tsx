'use client'

import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { TrackerContextForOptions } from '@/lib/binding'
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from '../../types'
import { resolveFieldOptionsV2 } from '@/lib/binding'
import { useEditMode, useLayoutActions, FieldRowEdit, SortableFieldRowEdit, fieldSortableId, parseFieldId } from '../../edit-mode'
import { getBindingForField, findOptionRow, applyBindings, parsePath, getValueFieldIdFromBinding } from '@/lib/resolve-bindings'
import { applyFieldOverrides, resolveDependsOnOverrides } from '@/lib/depends-on'
import { useTrackerOptionsContext } from '../../tracker-options-context'
import { useGridDependsOn } from '../../hooks/useGridDependsOn'
import type { OptionsGridFieldDef } from '../data-table/utils'
import type { FieldMetadata } from '../data-table/utils'
import { EntryFormDialog } from '../data-table/entry-form-dialog'
import { resolveDivStyles } from '@/lib/style-utils'

const ADD_OPTION_VALUE = '__add_option__'

interface TrackerDivGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  allLayoutNodes?: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  styleOverrides?: StyleOverrides
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onCrossGridUpdate?: (gridId: string, rowIndex: number, fieldId: string, value: unknown) => void
  onAddEntryToGrid?: (gridId: string, newRow: Record<string, unknown>) => void
  trackerContext?: TrackerContextForOptions
}

/**
 * Focus the first interactive element inside a container.
 * Used on the field wrapper so that clicking the border/padding area
 * immediately activates the input rather than requiring a second click.
 */
function focusInputInContainer(container: HTMLElement) {
  const input = container.querySelector<HTMLElement>(
    'input, textarea, [role="combobox"], [role="listbox"]'
  )
  if (input && document.activeElement !== input) {
    input.focus()
  }
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
  trackerContext: trackerContextProp,
}: TrackerDivGridProps) {
  const trackerOptionsFromContext = useTrackerOptionsContext()
  const trackerContext = trackerOptionsFromContext ?? trackerContextProp
  const { editMode, schema, onSchemaChange } = useEditMode()
  const { remove, move, reorder } = useLayoutActions(grid.id, schema, onSchemaChange)
  const canEditLayout = editMode && !!schema && !!onSchemaChange

  const ds = useMemo(() => resolveDivStyles(styleOverrides), [styleOverrides])
  const { dependsOnForGrid } = useGridDependsOn(grid.id, dependsOn)
  const fieldNodes = useMemo(() => {
    const nodes = layoutNodes.filter((n) => n.gridId === grid.id)
    return nodes.sort((a, b) => {
      const ra = a.row ?? a.order
      const ca = a.col ?? 0
      const rb = b.row ?? b.order
      const cb = b.col ?? 0
      if (ra !== rb) return ra - rb
      return ca - cb
    })
  }, [layoutNodes, grid.id])

  const fieldSortableIds = useMemo(
    () => fieldNodes.map((n) => fieldSortableId(grid.id, n.fieldId)),
    [grid.id, fieldNodes]
  )
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }, [])
  const handleFieldDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      const { active, over } = event
      if (!over || active.id === over.id || !reorder) return
      const currentIds = fieldNodes.map((n) => n.fieldId)
      const activeParsed = parseFieldId(String(active.id))
      const overParsed = parseFieldId(String(over.id))
      if (!activeParsed || !overParsed || activeParsed.gridId !== grid.id || overParsed.gridId !== grid.id) return
      const oldIndex = currentIds.indexOf(activeParsed.fieldId)
      const newIndex = currentIds.indexOf(overParsed.fieldId)
      if (oldIndex < 0 || newIndex < 0) return
      const reordered = arrayMove(currentIds, oldIndex, newIndex)
      reorder(reordered)
    },
    [grid.id, fieldNodes, reorder]
  )

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

  const rowKeys = useMemo(
    () => [...new Set(fieldNodes.map((n) => n.row ?? n.order))].sort((a, b) => a - b),
    [fieldNodes]
  )

  const activeDragField = useMemo(() => {
    if (!activeDragId) return null
    const parsed = parseFieldId(activeDragId)
    if (!parsed || parsed.gridId !== grid.id) return null
    const node = fieldNodes.find((n) => n.fieldId === parsed.fieldId)
    const field = node ? fields.find((f) => f.id === node.fieldId) : undefined
    return field ?? null
  }, [activeDragId, grid.id, fieldNodes, fields])

  if (fieldNodes.length === 0 && !canEditLayout) return null

  if (fieldNodes.length === 0 && canEditLayout) {
    return (
      <div className="py-2">
        <p className="text-xs text-muted-foreground/50">No fields — use Add below</p>
      </div>
    )
  }

  function renderFieldContent(node: TrackerLayoutNode, index: number) {
    const field = fields.find((f) => f.id === node.fieldId)
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
    const fieldLabel = field.ui.label
    const renderInput = () => {
      switch (field.dataType) {
        case 'text':
          return (
            <Textarea
              className={`min-h-[100px] leading-7 text-foreground/90 border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
              defaultValue={valueString}
              placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
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
              searchPlaceholder={`Select ${fieldLabel.toLowerCase()}...`}
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
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`w-full text-left flex items-center border-0 bg-transparent focus-visible:ring-0 rounded-md py-2 px-3 min-h-9 ${inputTextClass} ${!value ? 'text-muted-foreground' : ''}`}
                  disabled={isDisabled}
                >
                  {value ? (
                    format(new Date(String(value)), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={value ? new Date(String(value)) : undefined}
                  onSelect={(date) => {
                    if (isDisabled) return
                    if (date) {
                      const newDate = new Date(date)
                      newDate.setMinutes(newDate.getMinutes() - newDate.getTimezoneOffset())
                      onUpdate?.(0, field.id, newDate.toISOString())
                    }
                  }}
                  disabled={(date) =>
                    date > new Date('2100-01-01') || date < new Date('1900-01-01')
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )
        case 'number':
          return (
            <Input
              type="number"
              className={`border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
              defaultValue={typeof value === 'number' ? value : valueString}
              placeholder="0"
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
              placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
              disabled={isDisabled}
              onBlur={(e) =>
                onUpdate?.(0, field.id, e.target.value)
              }
            />
          )
      }
    }

    const labelContent = (
      <label className={`${ds.labelFontSize} font-medium text-muted-foreground ${ds.fontWeight}`}>
        {field.ui.label}
        {effectiveConfig?.isRequired && (
          <span className="text-destructive/80 ml-1">*</span>
        )}
      </label>
    )

    const inputContent = (
      <div
        className={`rounded-lg border bg-muted/30 focus-within:bg-background transition-colors border-input hover:border-ring focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 ${ds.fontSize} ${field.dataType === 'text' ? 'h-auto' : ''}`}
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          focusInputInContainer(e.currentTarget)
        }}
      >
        {renderInput()}
      </div>
    )

    if (canEditLayout) {
      return (
        <SortableFieldRowEdit
          key={field.id}
          gridId={grid.id}
          fieldId={field.id}
          label={field.ui.label}
          labelContent={labelContent}
          index={index}
          totalFields={fieldNodes.length}
          onRemove={() => remove(field.id)}
          onMoveUp={() => move(field.id, 'up')}
          onMoveDown={() => move(field.id, 'down')}
        >
          {inputContent}
        </SortableFieldRowEdit>
      )
    }

    return (
      <div key={field.id} className="space-y-1.5">
        {labelContent}
        {inputContent}
      </div>
    )
  }

  const fieldsContainer = (
    <div className="flex flex-col gap-4">
      {rowKeys.map((rowKey) => {
        const nodesInRow = fieldNodes
          .filter((n) => (n.row ?? n.order) === rowKey)
          .sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
        const gridCols =
          nodesInRow.length === 1 ? 'grid-cols-1' : nodesInRow.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        return (
          <div key={rowKey} className={`grid ${gridCols} gap-4`}>
            {nodesInRow.map((node) => {
              const index = fieldNodes.indexOf(node)
              return <div key={node.fieldId}>{renderFieldContent(node, index)}</div>
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-3">
      {canEditLayout ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleFieldDragEnd}
        >
          <SortableContext items={fieldSortableIds} strategy={rectSortingStrategy}>
            {fieldsContainer}
          </SortableContext>
          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: '0.5' } },
              }),
            }}
          >
            {activeDragField ? (
              <div className="flex flex-col w-full min-w-0 space-y-1.5 rounded-md border bg-background shadow-md p-3">
                <span className={`${ds.labelFontSize} font-medium text-muted-foreground ${ds.fontWeight}`}>
                  {activeDragField.ui.label}
                </span>
                <div
                  className={`rounded-lg border border-dashed bg-muted/30 ${ds.fontSize} min-h-9`}
                  aria-hidden
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        fieldsContainer
      )}
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
