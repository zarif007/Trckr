'use client'

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { resolveFieldOptionsV2, resolveFieldOptionsV2Async } from '@/lib/binding'
import { useEditMode, useLayoutActions, SortableFieldRowEdit, fieldSortableId, parseFieldId, FieldSettingsDialog } from '../../edit-mode'
import { DIV_GRID_MAX_COLS } from '../../edit-mode/utils'
import { getBindingForField, findOptionRow, applyBindings, parsePath, getValueFieldIdFromBinding } from '@/lib/resolve-bindings'
import { applyFieldOverrides, resolveDependsOnOverrides } from '@/lib/depends-on'
import { useTrackerOptionsContext } from '../../tracker-options-context'
import { useGridDependsOn } from '../../hooks/useGridDependsOn'
import type { OptionsGridFieldDef } from '../data-table/utils'
import type { FieldMetadata } from '../data-table/utils'
import { getValidationError } from '../data-table/utils'
import { EntryFormDialog } from '../data-table/entry-form-dialog'
import { resolveDivStyles } from '@/lib/style-utils'
import { applyCompiledCalculationsForRow, compileCalculationsForGrid } from '@/lib/field-calculation'
import type { TrackerLayoutNode, TrackerField } from '../../types'
import { EMPTY_ROW, GRID_COLS_CLASS } from './constants'
import type { TrackerDivGridProps, DropIndicator, DropPlacement } from './types'
import { buildRowsFromNodes, rebuildNodesFromRows, findRowIndex } from './layout-utils'
import { parseDropZoneId, getPointerCoordinates, getDropPlacementByPointer } from './drag-utils'
import { FieldDropZones } from './FieldDropZones'
import { DivGridFieldCell } from './DivGridFieldCell'

function TrackerDivGridInner({
  tabId,
  grid,
  layoutNodes,
  allLayoutNodes,
  fields,
  bindings = {},
  validations,
  calculations,
  styleOverrides,
  dependsOn,
  gridData = {},
  gridDataRef,
  gridDataForThisGrid,
  onUpdate,
  onCrossGridUpdate,
  onAddEntryToGrid,
  trackerContext: trackerContextProp,
}: TrackerDivGridProps) {
  const fullGridData = gridDataRef?.current ?? gridData
  const thisGridRows = gridDataForThisGrid ?? gridData?.[grid.id] ?? []
  const runtimeForDynamicOptionsRef = useRef<{
    currentGridId: string
    rowIndex: number
    currentRow: Record<string, unknown>
  } | null>(null)
  const runtimeForDynamicOptions = useMemo(() => {
    const row = thisGridRows[0] ?? {}
    const prev = runtimeForDynamicOptionsRef.current
    if (prev && prev.currentGridId === grid.id && prev.currentRow === row)
      return prev
    const next = { currentGridId: grid.id, rowIndex: 0, currentRow: row }
    runtimeForDynamicOptionsRef.current = next
    return next
  }, [grid.id, thisGridRows])
  const trackerOptionsFromContext = useTrackerOptionsContext()
  const trackerContext = trackerOptionsFromContext ?? trackerContextProp
  const { editMode, schema, onSchemaChange } = useEditMode()
  const { remove, move, applySchemaChange } = useLayoutActions(grid.id, schema, onSchemaChange)
  const canEditLayout = editMode && !!schema && !!onSchemaChange
  const [settingsFieldId, setSettingsFieldId] = useState<string | null>(null)
  const [asyncDynamicFieldOptions, setAsyncDynamicFieldOptions] = useState<
    Record<string, ReturnType<typeof resolveFieldOptionsV2> | undefined>
  >({})

  const ds = useMemo(() => resolveDivStyles(styleOverrides), [styleOverrides])
  const { dependsOnForGrid } = useGridDependsOn(grid.id, dependsOn)
  const fieldsById = useMemo(() => {
    const map = new Map<string, TrackerField>()
    fields.forEach((field) => map.set(field.id, field))
    return map
  }, [fields])
  const layoutNodesByGridId = useMemo(() => {
    const nodes = allLayoutNodes ?? layoutNodes
    const map = new Map<string, TrackerLayoutNode[]>()
    nodes.forEach((node) => {
      const list = map.get(node.gridId)
      if (list) {
        list.push(node)
      } else {
        map.set(node.gridId, [node])
      }
    })
    for (const list of map.values()) {
      list.sort((a, b) => a.order - b.order)
    }
    return map
  }, [allLayoutNodes, layoutNodes])
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
  const fieldIndexById = useMemo(() => {
    const map = new Map<string, number>()
    fieldNodes.forEach((node, index) => map.set(node.fieldId, index))
    return map
  }, [fieldNodes])
  const optionFieldIds = useMemo(
    () => fieldNodes.map((node) => node.fieldId),
    [fieldNodes]
  )
  const fieldOptionsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveFieldOptionsV2> | undefined>()
    optionFieldIds.forEach((fieldId) => {
      const field = fieldsById.get(fieldId)
      if (!field) return
      const needsOptions =
        field.dataType === 'options' ||
        field.dataType === 'multiselect' ||
        field.dataType === 'dynamic_select' ||
        field.dataType === 'dynamic_multiselect'
      if (!needsOptions) {
        map.set(fieldId, undefined)
        return
      }
      const syncOptions = resolveFieldOptionsV2(
        tabId,
        grid.id,
        field,
        bindings,
        fullGridData,
        trackerContext,
        runtimeForDynamicOptions
      )
      map.set(fieldId, asyncDynamicFieldOptions[fieldId] ?? syncOptions)
    })
    return map
  }, [optionFieldIds, fieldsById, tabId, grid.id, bindings, fullGridData, trackerContext, asyncDynamicFieldOptions])

  useEffect(() => {
    let cancelled = false
    const dynamicFieldIds = optionFieldIds.filter((fieldId) => {
      const field = fieldsById.get(fieldId)
      return (
        field?.dataType === 'dynamic_select' ||
        field?.dataType === 'dynamic_multiselect' ||
        field?.dataType === 'field_mappings'
      )
    })

    if (!trackerContext || dynamicFieldIds.length === 0) {
      setAsyncDynamicFieldOptions((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      )
      return
    }

    ;(async () => {
      const entries = await Promise.all(
        dynamicFieldIds.map(async (fieldId) => {
          const field = fieldsById.get(fieldId)
          if (!field) {
            return [fieldId, [] as ReturnType<typeof resolveFieldOptionsV2>] as const
          }
          try {
            const options = await resolveFieldOptionsV2Async(
              tabId,
              grid.id,
              field,
              bindings,
              fullGridData,
              trackerContext,
              runtimeForDynamicOptions
            )
            return [fieldId, options] as const
          } catch {
            return [fieldId, [] as ReturnType<typeof resolveFieldOptionsV2>] as const
          }
        })
      )
      if (cancelled) return
      const next: Record<string, ReturnType<typeof resolveFieldOptionsV2> | undefined> = {}
      for (const [fieldId, options] of entries) {
        next[fieldId] = options
      }
      setAsyncDynamicFieldOptions(next)
    })()

    return () => {
      cancelled = true
    }
  }, [optionFieldIds, fieldsById, tabId, grid.id, bindings, fullGridData, trackerContext, runtimeForDynamicOptions])
  const bindingByFieldId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getBindingForField> | undefined>()
    optionFieldIds.forEach((fieldId) => {
      const field = fieldsById.get(fieldId)
      if (!field) return
      if (field.dataType === 'options' || field.dataType === 'multiselect') {
        map.set(fieldId, getBindingForField(grid.id, fieldId, bindings, tabId))
      }
    })
    return map
  }, [optionFieldIds, fieldsById, grid.id, bindings, tabId])
  const addOptionConfigByFieldId = useMemo(() => {
    const map = new Map<
      string,
      {
        optionsGridFields: OptionsGridFieldDef[]
        onAddOption: (row: Record<string, unknown>) => string
        optionsGridId?: string
        isMultiselect: boolean
      }
    >()
    if (!onAddEntryToGrid) return map
    optionFieldIds.forEach((fieldId) => {
      const field = fieldsById.get(fieldId)
      const binding = bindingByFieldId.get(fieldId)
      if (!binding || !field) return
      const optionsGridId = binding.optionsGrid?.includes('.') ? binding.optionsGrid.split('.').pop()! : binding.optionsGrid
      if (!optionsGridId) return
      const selectFieldPath = `${grid.id}.${fieldId}`
      const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)
      const { fieldId: labelFieldId } = parsePath(binding.labelField)
      const optionLayoutNodes = layoutNodesByGridId.get(optionsGridId) ?? []
      const optionsGridFields = optionLayoutNodes
        .map((n) => fieldsById.get(n.fieldId))
        .filter((f): f is NonNullable<typeof f> => !!f && !f.config?.isHidden)
        .map((f) => ({
          id: f.id,
          label: f.ui.label,
          type: f.dataType as OptionsGridFieldDef['type'],
          config: f.config as OptionsGridFieldDef['config'],
          validations: validations?.[optionsGridId ? `${optionsGridId}.${f.id}` : f.id],
        }))
      const onAddOption = (row: Record<string, unknown>) => {
        onAddEntryToGrid(optionsGridId, row)
        const val = row[valueFieldId ?? '']
        const label = labelFieldId ? row[labelFieldId] : undefined
        return String(val ?? label ?? '')
      }
      map.set(fieldId, { optionsGridFields, onAddOption, optionsGridId, isMultiselect: field.dataType === 'multiselect' })
    })
    return map
  }, [
    optionFieldIds,
    bindingByFieldId,
    grid.id,
    fieldsById,
    layoutNodesByGridId,
    validations,
    onAddEntryToGrid,
  ])
  const nodesByRow = useMemo(() => {
    const map = new Map<number, TrackerLayoutNode[]>()
    fieldNodes.forEach((node) => {
      const rowKey = node.row ?? node.order
      const list = map.get(rowKey)
      if (list) {
        list.push(node)
      } else {
        map.set(rowKey, [node])
      }
    })
    for (const list of map.values()) {
      list.sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
    }
    return map
  }, [fieldNodes])
  const rowKeyByFieldId = useMemo(() => {
    const map = new Map<string, number>()
    nodesByRow.forEach((nodes, rowKey) => {
      nodes.forEach((node) => map.set(node.fieldId, rowKey))
    })
    return map
  }, [nodesByRow])

  const fieldSortableIds = useMemo(
    () => fieldNodes.map((n) => fieldSortableId(grid.id, n.fieldId)),
    [grid.id, fieldNodes]
  )
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null)
  const dropIndicatorRef = useRef<DropIndicator>(null)
  dropIndicatorRef.current = dropIndicator
  const lastOverIdRef = useRef<string | null>(null)
  const collisionDetection = useCallback(
    (args: Parameters<typeof pointerWithin>[0]) => {
      const pointerCollisions = pointerWithin(args)
      return pointerCollisions.length ? pointerCollisions : closestCenter(args)
    },
    []
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
    lastOverIdRef.current = String(event.active.id)
    setDropIndicator(null)
  }, [])
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, over } = event
    if (over?.id) lastOverIdRef.current = String(over.id)
    const overId = over?.id ? String(over.id) : lastOverIdRef.current
    if (!overId || String(active.id) === overId) {
      setDropIndicator((prev) => (prev ? null : prev))
      return
    }
    const zone = parseDropZoneId(overId)
    const pointer = getPointerCoordinates(event)
    const prevPlacement = dropIndicatorRef.current?.placement ?? null
    const placement = zone?.placement ?? getDropPlacementByPointer(event.over?.rect, pointer, prevPlacement)
    if (!placement) {
      setDropIndicator((prev) => (prev ? null : prev))
      return
    }
    const targetFieldId = zone?.fieldId ?? parseFieldId(overId)?.fieldId
    if (!targetFieldId) {
      setDropIndicator((prev) => (prev ? null : prev))
      return
    }
    const next = { overId: fieldSortableId(grid.id, targetFieldId), placement }
    setDropIndicator((prev) =>
      prev && prev.overId === next.overId && prev.placement === next.placement ? prev : next
    )
  }, [grid.id])
  const handleFieldDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      setDropIndicator(null)
      const { active, over } = event
      const overId = over?.id ? String(over.id) : lastOverIdRef.current
      lastOverIdRef.current = null
      if (!overId || active.id === overId || !applySchemaChange || !schema) return
      const activeParsed = parseFieldId(String(active.id))
      const zone = parseDropZoneId(overId)
      const overParsed = zone ? { gridId: zone.gridId, fieldId: zone.fieldId } : parseFieldId(overId)
      if (!activeParsed || !overParsed || activeParsed.gridId !== grid.id || overParsed.gridId !== grid.id) return
      const pointer = getPointerCoordinates(event)
      const prevPlacement = dropIndicatorRef.current?.placement ?? null
      const placement = zone?.placement ?? getDropPlacementByPointer(event.over?.rect, pointer, prevPlacement)
      if (!placement) return

      const currentNodes = (schema.layoutNodes ?? []).filter((n) => n.gridId === grid.id)
      const otherNodes = (schema.layoutNodes ?? []).filter((n) => n.gridId !== grid.id)
      const existingByField = new Map(currentNodes.map((n) => [n.fieldId, n] as const))
      const rows = buildRowsFromNodes(currentNodes, DIV_GRID_MAX_COLS)
      const activeLoc = findRowIndex(rows, activeParsed.fieldId)
      if (!activeLoc) return

      const [activeNode] = rows[activeLoc.rowIndex].splice(activeLoc.colIndex, 1)
      if (!activeNode) return
      if (rows[activeLoc.rowIndex].length === 0) {
        rows.splice(activeLoc.rowIndex, 1)
      }

      const overLoc = findRowIndex(rows, overParsed.fieldId)
      if (!overLoc) return

      const overRect = event.over?.rect ?? null
      const verticalFallback: DropPlacement =
        pointer && overRect && pointer.y < overRect.top + overRect.height / 2 ? 'above' : 'below'

      if (placement === 'left' || placement === 'right') {
        const targetRow = rows[overLoc.rowIndex] ?? []
        if (targetRow.length >= DIV_GRID_MAX_COLS) {
          const insertRowIndex = verticalFallback === 'above' ? overLoc.rowIndex : overLoc.rowIndex + 1
          rows.splice(insertRowIndex, 0, [activeNode])
        } else {
          const insertIndex = placement === 'left' ? overLoc.colIndex : overLoc.colIndex + 1
          targetRow.splice(insertIndex, 0, activeNode)
        }
      } else {
        const insertRowIndex = placement === 'above' ? overLoc.rowIndex : overLoc.rowIndex + 1
        rows.splice(insertRowIndex, 0, [activeNode])
      }

      const nextNodes = rebuildNodesFromRows(rows, grid.id, existingByField)
      applySchemaChange([...otherNodes, ...nextNodes])
    },
    [applySchemaChange, grid.id, schema]
  )
  const handleDragCancel = useCallback(() => {
    setActiveDragId(null)
    setDropIndicator(null)
    lastOverIdRef.current = null
  }, [])

  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [addOptionOpen, setAddOptionOpen] = useState(false)
  const [addOptionContext, setAddOptionContext] = useState<{
    fieldId: string
    onAddOption: (row: Record<string, unknown>) => string
    isMultiselect: boolean
    currentValue: unknown
    optionsGridFields: OptionsGridFieldDef[]
    optionsGridId?: string
  } | null>(null)

  const addOptionFieldMetadata: FieldMetadata = useMemo(() => {
    const meta: FieldMetadata = {}
    const optionsGridId = addOptionContext?.optionsGridId
    addOptionContext?.optionsGridFields?.forEach((f) => {
      meta[f.id] = {
        name: f.label,
        type: f.type,
        config: f.config,
        validations: validations?.[optionsGridId ? `${optionsGridId}.${f.id}` : f.id],
      }
    })
    return meta
  }, [addOptionContext?.optionsGridFields, addOptionContext?.optionsGridId, validations])

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

  const data = useMemo(() => thisGridRows[0] ?? EMPTY_ROW, [thisGridRows, grid.id])
  const [draftRow, setDraftRow] = useState<Record<string, unknown>>(() => data)
  const [touchedFieldIds, setTouchedFieldIds] = useState<Set<string>>(() => new Set())
  const [dirtyFieldIds, setDirtyFieldIds] = useState<Set<string>>(() => new Set())
  const touchedFieldIdsRef = useRef(touchedFieldIds)
  useEffect(() => {
    touchedFieldIdsRef.current = touchedFieldIds
  }, [touchedFieldIds])
  useEffect(() => {
    setDraftRow((prev) => {
      const next = { ...data }
      touchedFieldIdsRef.current.forEach((fieldId) => {
        next[fieldId] = prev[fieldId]
      })
      return next
    })
  }, [data, grid.id])

  const rowValuesForValidation = useMemo(() => {
    const base = { ...draftRow }
    for (const n of fieldNodes) {
      base[`${grid.id}.${n.fieldId}`] = draftRow[n.fieldId] ?? data[n.fieldId]
    }
    return base
  }, [draftRow, data, grid.id, fieldNodes])

  const compiledCalculationPlan = useMemo(() => {
    if (!calculations || Object.keys(calculations).length === 0) return null
    return compileCalculationsForGrid(grid.id, calculations)
  }, [calculations, grid.id])

  const handleFieldUpdate = useCallback(
    (fieldId: string, value: unknown) => {
      const base = { ...data, ...draftRow, [fieldId]: value }
      const calc = compiledCalculationPlan
        ? applyCompiledCalculationsForRow({
            plan: compiledCalculationPlan,
            row: base,
            changedFieldIds: [fieldId],
          })
        : { row: base, updatedFieldIds: [], skippedCyclicTargets: [] }

      setDirtyFieldIds((prev) => new Set(prev).add(fieldId))
      setDraftRow(calc.row)
      const updates = new Set<string>([fieldId, ...calc.updatedFieldIds])
      for (const id of updates) {
        onUpdate?.(0, id, calc.row[id])
      }
    },
    [compiledCalculationPlan, data, draftRow, onUpdate]
  )
  const handleFieldUpdateWithTouched = useCallback(
    (fieldId: string, value: unknown) => {
      setTouchedFieldIds((prev) => new Set(prev).add(fieldId))
      handleFieldUpdate(fieldId, value)
    },
    [handleFieldUpdate]
  )

  const applyAddOption = useCallback(
    (values: Record<string, unknown>) => {
      if (!addOptionContext) return
      const normalized = { ...values }
      addOptionContext.optionsGridFields.forEach((f) => {
        if (normalized[f.id] === '' && (f.type === 'number' || f.type === 'string')) {
          normalized[f.id] = f.type === 'number' ? undefined : ''
        }
      })
      const newValue = addOptionContext.onAddOption(normalized)
      if (addOptionContext.isMultiselect) {
        const currentVal = draftRow[addOptionContext.fieldId] ?? data[addOptionContext.fieldId]
        const current = Array.isArray(currentVal) ? currentVal : []
        const next = [...current.map(String), newValue]
        handleFieldUpdateWithTouched(addOptionContext.fieldId, next)
      } else {
        handleFieldUpdateWithTouched(addOptionContext.fieldId, newValue)
      }
    },
    [addOptionContext, draftRow, data, handleFieldUpdateWithTouched]
  )

  const handleSelectChange = useCallback(
    (fieldId: string, selectedValue: unknown) => {
      handleFieldUpdateWithTouched(fieldId, selectedValue)
      const field = fieldsById.get(fieldId)
      if (!field || (field.dataType !== 'options' && field.dataType !== 'multiselect')) return
      const binding = bindingByFieldId.get(fieldId)
      if (!binding || binding.fieldMappings.length === 0) return
      const selectFieldPath = `${grid.id}.${fieldId}`
      const optionRow = findOptionRow(fullGridData, binding, selectedValue, selectFieldPath)
      if (!optionRow) return
      const updates = applyBindings(binding, optionRow, selectFieldPath)
      for (const update of updates) {
        const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(update.targetPath)
        if (targetGridId && targetFieldId) {
          if (onCrossGridUpdate) {
            onCrossGridUpdate(targetGridId, 0, targetFieldId, update.value)
          } else if (targetGridId === grid.id) {
            handleFieldUpdateWithTouched(targetFieldId, update.value)
          }
        }
      }
    },
    [
      handleFieldUpdateWithTouched,
      fieldsById,
      bindingByFieldId,
      fullGridData,
      grid.id,
      onCrossGridUpdate,
    ]
  )

  const openAddOption = useCallback(
    (fieldId: string, currentValue?: unknown) => {
      const config = addOptionConfigByFieldId.get(fieldId)
      if (!config) return
      setAddOptionContext({
        fieldId,
        onAddOption: config.onAddOption,
        isMultiselect: config.isMultiselect,
        currentValue,
        optionsGridFields: config.optionsGridFields,
        optionsGridId: config.optionsGridId,
      })
      setAddOptionOpen(true)
    },
    [addOptionConfigByFieldId]
  )

  const fieldOverrides = useMemo(
    () => resolveDependsOnOverrides(dependsOnForGrid, fullGridData, grid.id, 0, data),
    [dependsOnForGrid, fullGridData, grid.id, data]
  )

  const rowKeys = useMemo(() => [...nodesByRow.keys()].sort((a, b) => a - b), [nodesByRow])

  const activeDragField = useMemo(() => {
    if (!activeDragId) return null
    const parsed = parseFieldId(activeDragId)
    if (!parsed || parsed.gridId !== grid.id) return null
    const field = fieldsById.get(parsed.fieldId)
    return field ?? null
  }, [activeDragId, grid.id, fieldsById])

  const inputTextClass = useMemo(
    () => `${ds.fontSize} ${ds.fontWeight} ${ds.textColor}`.trim(),
    [ds.fontSize, ds.fontWeight, ds.textColor]
  )
  const setDatePickerOpenStable = useCallback((open: boolean) => setDatePickerOpen(open), [])

  if (fieldNodes.length === 0 && !canEditLayout) return null

  if (fieldNodes.length === 0 && canEditLayout) {
    return (
      <div className="py-2">
        <p className="text-xs text-muted-foreground/50">No fields — use Add below</p>
      </div>
    )
  }

  function renderFieldContent(node: TrackerLayoutNode, index: number) {
    const field = fieldsById.get(node.fieldId)
    if (!field) return null
    const effectiveConfig = applyFieldOverrides(field.config, fieldOverrides[field.id])
    if (effectiveConfig?.isHidden) return null

    const options = fieldOptionsMap.get(field.id)
    const fieldRules = validations?.[`${grid.id}.${field.id}`]
    const rawValue = draftRow[field.id] ?? data[field.id]
    const value =
      effectiveConfig && 'value' in effectiveConfig && (effectiveConfig as { value?: unknown }).value !== undefined
        ? (effectiveConfig as { value: unknown }).value
        : rawValue
    const valueString =
      typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
    const isDisabled =
      !!effectiveConfig?.isDisabled ||
      (effectiveConfig && 'value' in effectiveConfig && (effectiveConfig as { value?: unknown }).value !== undefined)

    const fieldRulesResolved = fieldRules ?? []
    const validationError =
      fieldRulesResolved.length > 0
        ? getValidationError({
            value,
            fieldId: field.id,
            fieldType: field.dataType,
            config: effectiveConfig,
            rules: fieldRulesResolved,
            rowValues: rowValuesForValidation,
          })
        : null
    const showError =
      (dirtyFieldIds.has(field.id) || touchedFieldIds.has(field.id)) && !!validationError

    const wrapperClassName = `${ds.fontSize} ${field.dataType === 'text' ? 'h-auto' : ''}`.trim()

    const labelContent = (
      <label className={`${ds.labelFontSize} font-medium text-muted-foreground ${ds.fontWeight}`}>
        {field.ui.label}
        {effectiveConfig?.isRequired && (
          <span className="text-destructive/80 ml-1">*</span>
        )}
      </label>
    )

    const inputContent = (
      <DivGridFieldCell
        field={field}
        value={value}
        valueString={valueString}
        options={options}
        showError={showError}
        validationError={validationError}
        isDisabled={isDisabled}
        inputTextClass={inputTextClass}
        wrapperClassName={wrapperClassName}
        onUpdate={handleFieldUpdate}
        onUpdateWithTouched={handleFieldUpdateWithTouched}
        onSelectChange={handleSelectChange}
        openAddOption={openAddOption}
        datePickerOpen={datePickerOpen}
        onDatePickerOpenChange={setDatePickerOpenStable}
      />
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
          onSettings={() => setSettingsFieldId(field.id)}
        >
          {inputContent}
        </SortableFieldRowEdit>
      )
    }

    return (
      <div key={field.id} className="space-y-1 min-w-0">
        {labelContent}
        {inputContent}
      </div>
    )
  }

  const fieldsContainer = (
    <div className="flex flex-col gap-2.5 min-w-0">
      {rowKeys.map((rowKey) => {
        const nodesInRow = nodesByRow.get(rowKey) ?? []
        const dropTargetFieldId = dropIndicator ? parseFieldId(dropIndicator.overId)?.fieldId : null
        const isDropRow = dropTargetFieldId != null && rowKeyByFieldId.get(dropTargetFieldId) === rowKey
        const gridCols = GRID_COLS_CLASS[Math.min(Math.max(nodesInRow.length, 1), DIV_GRID_MAX_COLS)] ?? 'grid-cols-1'
        return (
          <div
            key={rowKey}
            className={`grid ${gridCols} gap-2.5 min-w-0 transition-[box-shadow,border-color] duration-150 ${isDropRow ? 'ring-1 ring-primary/20 rounded-lg p-1 -m-1' : ''}`}
          >
            {nodesInRow.map((node, nodeIndex) => {
              const index = fieldIndexById.get(node.fieldId) ?? 0
              const indicator =
                canEditLayout && activeDragId && dropIndicator?.overId === fieldSortableId(grid.id, node.fieldId)
                  ? dropIndicator.placement
                  : null
              return (
                <div key={`${rowKey}-${nodeIndex}`} className="relative min-w-0">
                  {renderFieldContent(node, index)}
                  <FieldDropZones gridId={grid.id} fieldId={node.fieldId} enabled={canEditLayout} />
                  {indicator === 'left' && (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary/80 pointer-events-none transition-opacity duration-150" />
                  )}
                  {indicator === 'right' && (
                    <span className="absolute inset-y-2 right-0 w-0.5 rounded-full bg-primary/80 pointer-events-none transition-opacity duration-150" />
                  )}
                  {indicator === 'above' && (
                    <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-primary/80 pointer-events-none transition-opacity duration-150" />
                  )}
                  {indicator === 'below' && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary/80 pointer-events-none transition-opacity duration-150" />
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-2 min-w-0">
      {canEditLayout ? (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleFieldDragEnd}
          onDragCancel={handleDragCancel}
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
          gridId={addOptionContext.optionsGridId}
          calculations={calculations}
          mode="add"
        />
      )}
      {canEditLayout && schema && onSchemaChange && (
        <FieldSettingsDialog
          open={settingsFieldId != null}
          onOpenChange={(open) => {
            if (!open) setSettingsFieldId(null)
          }}
          fieldId={settingsFieldId}
          gridId={grid.id}
          schema={schema}
          onSchemaChange={onSchemaChange}
        />
      )}
    </div>
  )
}

export const TrackerDivGrid = memo(TrackerDivGridInner)
