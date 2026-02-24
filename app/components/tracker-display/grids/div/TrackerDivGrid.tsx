'use client'

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
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
  pointerWithin,
  useDroppable,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { getEventCoordinates } from '@dnd-kit/utilities'
import type { TrackerContextForOptions } from '@/lib/binding'
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from '../../types'
import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'
import { resolveFieldOptionsV2 } from '@/lib/binding'
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

const ADD_OPTION_VALUE = '__add_option__'
const EMPTY_ROW: Record<string, unknown> = {}
const DROP_ZONE_PREFIX = 'field-drop'
const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
}

interface TrackerDivGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  allLayoutNodes?: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  validations?: Record<string, FieldValidationRule[]>
  calculations?: Record<string, FieldCalculationRule>
  styleOverrides?: StyleOverrides
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
  gridDataRef?: React.RefObject<Record<string, Array<Record<string, unknown>>>> | null
  gridDataForThisGrid?: Array<Record<string, unknown>>
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

type DropPlacement = 'left' | 'right' | 'above' | 'below'
type DropIndicator = { overId: string; placement: DropPlacement } | null

function fieldDropZoneId(gridId: string, fieldId: string, placement: DropPlacement) {
  return `${DROP_ZONE_PREFIX}::${gridId}::${fieldId}::${placement}`
}

function parseDropZoneId(id: string): { gridId: string; fieldId: string; placement: DropPlacement } | null {
  if (!id.startsWith(`${DROP_ZONE_PREFIX}::`)) return null
  const parts = id.split('::')
  if (parts.length !== 4) return null
  const [, gridId, fieldId, placement] = parts
  if (placement !== 'left' && placement !== 'right' && placement !== 'above' && placement !== 'below') return null
  return { gridId, fieldId, placement }
}

function getPointerCoordinates(event: DragMoveEvent | DragEndEvent) {
  const coords = getEventCoordinates(event.activatorEvent)
  if (!coords) return null
  return coords
}

/** Rect-like shape used by getDropPlacementByPointer (compatible with DOM and @dnd-kit rects). */
type RectLike = { top: number; left: number; right: number; bottom: number; width: number; height: number }

function getDropPlacementByPointer(
  overRect: RectLike | null | undefined,
  pointer: { x: number; y: number } | null,
  previous: DropPlacement | null
): DropPlacement | null {
  if (!overRect || !pointer) return previous
  const left = pointer.x - overRect.left
  const right = overRect.right - pointer.x
  const top = pointer.y - overRect.top
  const bottom = overRect.bottom - pointer.y

  const verticalEdgeZone = overRect.height * 0.25
  if (top <= verticalEdgeZone) return 'above'
  if (bottom <= verticalEdgeZone) return 'below'

  const centerX = overRect.left + overRect.width / 2
  return pointer.x < centerX ? 'left' : 'right'
}

function FieldDropZones({
  gridId,
  fieldId,
  enabled,
}: {
  gridId: string
  fieldId: string
  enabled: boolean
}) {
  const leftZone = useDroppable({ id: fieldDropZoneId(gridId, fieldId, 'left') })
  const rightZone = useDroppable({ id: fieldDropZoneId(gridId, fieldId, 'right') })
  const topZone = useDroppable({ id: fieldDropZoneId(gridId, fieldId, 'above') })
  const bottomZone = useDroppable({ id: fieldDropZoneId(gridId, fieldId, 'below') })

  if (!enabled) return null

  return (
    <>
      <div ref={topZone.setNodeRef} className="pointer-events-none absolute left-0 right-0 top-0 h-[20%]" />
      <div ref={bottomZone.setNodeRef} className="pointer-events-none absolute left-0 right-0 bottom-0 h-[20%]" />
      <div ref={leftZone.setNodeRef} className="pointer-events-none absolute left-0 top-[20%] bottom-[20%] w-1/2" />
      <div ref={rightZone.setNodeRef} className="pointer-events-none absolute right-0 top-[20%] bottom-[20%] w-1/2" />
    </>
  )
}

function splitRow(nodes: TrackerLayoutNode[], maxCols: number): TrackerLayoutNode[][] {
  const rows: TrackerLayoutNode[][] = []
  for (let i = 0; i < nodes.length; i += maxCols) {
    rows.push(nodes.slice(i, i + maxCols))
  }
  return rows
}

function buildRowsFromNodes(
  nodes: TrackerLayoutNode[],
  maxCols: number
): TrackerLayoutNode[][] {
  if (nodes.length === 0) return []
  const hasFullPos = nodes.every((n) => n.row != null && n.col != null)
  if (!hasFullPos) {
    const ordered = [...nodes].sort((a, b) => a.order - b.order)
    return splitRow(ordered, maxCols)
  }
  const byRow = new Map<number, TrackerLayoutNode[]>()
  nodes.forEach((node) => {
    const rowKey = node.row ?? 0
    const list = byRow.get(rowKey)
    if (list) {
      list.push(node)
    } else {
      byRow.set(rowKey, [node])
    }
  })
  const rowKeys = [...byRow.keys()].sort((a, b) => a - b)
  const rows: TrackerLayoutNode[][] = []
  rowKeys.forEach((rowKey) => {
    const rowNodes = (byRow.get(rowKey) ?? []).sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
    rows.push(...splitRow(rowNodes, maxCols))
  })
  return rows
}

function rebuildNodesFromRows(
  rows: TrackerLayoutNode[][],
  gridId: string,
  existingByField: Map<string, TrackerLayoutNode>
): TrackerLayoutNode[] {
  const next: TrackerLayoutNode[] = []
  let order = 0
  rows.forEach((rowNodes, rowIndex) => {
    rowNodes.forEach((node, colIndex) => {
      const existing = existingByField.get(node.fieldId) ?? node
      next.push({
        ...existing,
        gridId,
        fieldId: node.fieldId,
        order,
        row: rowIndex,
        col: colIndex,
      })
      order += 1
    })
  })
  return next
}

function findRowIndex(
  rows: TrackerLayoutNode[][],
  fieldId: string
): { rowIndex: number; colIndex: number } | null {
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r]
    const c = row.findIndex((n) => n.fieldId === fieldId)
    if (c >= 0) return { rowIndex: r, colIndex: c }
  }
  return null
}

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
  const trackerOptionsFromContext = useTrackerOptionsContext()
  const trackerContext = trackerOptionsFromContext ?? trackerContextProp
  const { editMode, schema, onSchemaChange } = useEditMode()
  const { remove, move, applySchemaChange } = useLayoutActions(grid.id, schema, onSchemaChange)
  const canEditLayout = editMode && !!schema && !!onSchemaChange
  const [settingsFieldId, setSettingsFieldId] = useState<string | null>(null)

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
      map.set(
        fieldId,
        needsOptions ? resolveFieldOptionsV2(tabId, grid.id, field, bindings, fullGridData, trackerContext) : undefined
      )
    })
    return map
  }, [optionFieldIds, fieldsById, tabId, grid.id, bindings, fullGridData, trackerContext])
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
      }
    >()
    if (!onAddEntryToGrid) return map
    optionFieldIds.forEach((fieldId) => {
      const binding = bindingByFieldId.get(fieldId)
      if (!binding) return
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
      map.set(fieldId, { optionsGridFields, onAddOption, optionsGridId })
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
    const placement = zone?.placement ?? getDropPlacementByPointer(event.over?.rect, pointer, dropIndicator?.placement ?? null)
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
  }, [dropIndicator?.placement])
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
      const placement = zone?.placement ?? getDropPlacementByPointer(event.over?.rect, pointer, dropIndicator?.placement ?? null)
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
    [applySchemaChange, dropIndicator?.placement, grid.id, schema]
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
      const currentVal = draftRow[addOptionContext.fieldId] ?? data[addOptionContext.fieldId]
      const current = Array.isArray(currentVal) ? currentVal : []
      const next = [...current.map(String), newValue]
      handleFieldUpdateWithTouched(addOptionContext.fieldId, next)
    } else {
      handleFieldUpdateWithTouched(addOptionContext.fieldId, newValue)
    }
  }

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
    const addOptionConfig = addOptionConfigByFieldId.get(field.id)
    const optionsGridFields: OptionsGridFieldDef[] = addOptionConfig?.optionsGridFields ?? []
    const onAddOption = addOptionConfig?.onAddOption
    const optionsGridId = addOptionConfig?.optionsGridId

    const fieldRules = validations?.[`${grid.id}.${field.id}`]
    const rawValue = draftRow[field.id] ?? data[field.id]
    const value = (effectiveConfig && 'value' in effectiveConfig && (effectiveConfig as { value?: unknown }).value !== undefined)
      ? (effectiveConfig as { value: unknown }).value
      : rawValue
    const valueString = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
    const isDisabled = !!effectiveConfig?.isDisabled || (effectiveConfig && 'value' in effectiveConfig && (effectiveConfig as { value?: unknown }).value !== undefined)

    const fieldRulesResolved = fieldRules ?? []
    const validationError = fieldRulesResolved.length
      ? getValidationError({
        value,
        fieldId: field.id,
        fieldType: field.dataType,
        config: effectiveConfig,
        rules: fieldRulesResolved,
        rowValues: rowValuesForValidation,
      })
      : null
    const showError = (dirtyFieldIds.has(field.id) || touchedFieldIds.has(field.id)) && !!validationError

    const handleSelectChange = (selectedValue: unknown) => {
      handleFieldUpdateWithTouched(field.id, selectedValue)

      if (field.dataType === 'options' || field.dataType === 'multiselect') {
        const binding = bindingByFieldId.get(field.id)
        if (binding && binding.fieldMappings.length > 0) {
          const selectFieldPath = `${grid.id}.${field.id}`
          const optionRow = findOptionRow(fullGridData, binding, selectedValue, selectFieldPath)
          if (optionRow) {
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
              value={valueString}
              placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
              disabled={isDisabled}
              onChange={(e) => handleFieldUpdate(field.id, e.target.value)}
              onBlur={(e) =>
                handleFieldUpdateWithTouched(field.id, e.target.value)
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
                  handleFieldUpdateWithTouched(field.id, checked)
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
                  setAddOptionContext({ fieldId: field.id, onAddOption, isMultiselect: false, currentValue: value, optionsGridFields, optionsGridId })
                  setAddOptionOpen(true)
                  return
                }
                handleSelectChange(val === '__empty__' ? '' : val)
              }}
              searchPlaceholder={`Select ${fieldLabel.toLowerCase()}...`}
              className={`w-full border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
              onAddOptionClick={onAddOption ? () => {
                setAddOptionContext({ fieldId: field.id, onAddOption, isMultiselect: false, currentValue: value, optionsGridFields, optionsGridId })
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
                setAddOptionContext({ fieldId: field.id, onAddOption, isMultiselect: true, currentValue: value, optionsGridFields, optionsGridId })
                setAddOptionOpen(true)
              } : undefined}
            />
          )
        }
        case 'date':
          return (
            <Popover modal={true} open={datePickerOpen} onOpenChange={setDatePickerOpen}>
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
                  onSelect={(selected) => {
                    if (isDisabled) return
                    if (selected instanceof Date) {
                      const newDate = new Date(selected)
                      newDate.setMinutes(newDate.getMinutes() - newDate.getTimezoneOffset())
                      handleFieldUpdateWithTouched(field.id, newDate.toISOString())
                    }
                  }}
                  onCloseRequest={() => setDatePickerOpen(false)}
                  disabled={(date) =>
                    date > new Date('2100-01-01') || date < new Date('1900-01-01')
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )
        case 'number': {
          const numValue = typeof value === 'number' ? value : valueString
          return (
            <Input
              type="number"
              className={`border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
              value={numValue === '' ? '' : numValue}
              placeholder="0"
              disabled={isDisabled}
              onChange={(e) => {
                const raw = e.target.value
                handleFieldUpdate(field.id, raw === '' ? undefined : Number(raw))
              }}
              onBlur={(e) =>
                handleFieldUpdateWithTouched(field.id, e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          )
        }
        default:
          return (
            <Input
              className={`border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
              value={valueString}
              placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
              disabled={isDisabled}
              onChange={(e) => handleFieldUpdate(field.id, e.target.value)}
              onBlur={(e) =>
                handleFieldUpdateWithTouched(field.id, e.target.value)
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
      <div className="space-y-1 min-w-0">
        <div
          className={`min-w-0 rounded-lg border bg-muted/30 focus-within:bg-background transition-colors hover:border-ring focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 ${ds.fontSize} ${field.dataType === 'text' ? 'h-auto' : ''} ${showError ? 'border-destructive/60 ring-1 ring-destructive/40' : 'border-input'}`}
          title={showError ? validationError ?? undefined : undefined}
          onPointerDown={(e) => {
            e.stopPropagation()
          }}
          onClick={(e) => {
            focusInputInContainer(e.currentTarget)
          }}
        >
          {renderInput()}
        </div>
        {showError && validationError ? (
          <p className="text-xs text-destructive" role="alert">
            {validationError}
          </p>
        ) : null}
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
