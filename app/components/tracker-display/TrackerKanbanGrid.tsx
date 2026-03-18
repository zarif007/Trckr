'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Settings2 } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { getBindingForField, findOptionRow, applyBindings, parsePath } from '@/lib/resolve-bindings'
import { resolveDependsOnOverrides } from '@/lib/depends-on'
import { resolveKanbanStyles } from '@/lib/style-utils'
import { EntryFormDialog } from './grids/data-table/entry-form-dialog'
import { useTrackerOptionsContext } from './tracker-options-context'
import { useGridDependsOn } from './hooks/useGridDependsOn'
import { EntryWayButton } from './entry-way/EntryWayButton'
import { buildEntryWaysForGrid } from './entry-way/entry-way-registry'
import {
  KanbanCard,
  SortableKanbanCard,
  DroppableEmptyColumn,
  ColumnDropZone,
  useKanbanGroups,
} from './grids/kanban'
import type {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from './types'
import type { TrackerContextForOptions } from '@/lib/binding'
import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'

const EMPTY_ROWS: Array<Record<string, unknown>> = []
const EMPTY_GROUPS: Array<{ id: string; label: string }> = []
const EMPTY_FIELDS: TrackerField[] = []

export interface TrackerKanbanGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  validations?: Record<string, FieldValidationRule[]>
  calculations?: Record<string, FieldCalculationRule>
  styleOverrides?: StyleOverrides
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
  gridDataRef?: React.RefObject<Record<string, Array<Record<string, unknown>>>> | null
  gridDataForThisGrid?: Array<Record<string, unknown>>
  readOnly?: boolean
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
  onDeleteEntries?: (rowIndices: number[]) => void
  onCrossGridUpdate?: (gridId: string, rowIndex: number, fieldId: string, value: unknown) => void
  trackerContext?: TrackerContextForOptions
}

function TrackerKanbanGridInner({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings = {},
  validations,
  calculations,
  styleOverrides,
  dependsOn,
  gridData = {},
  gridDataForThisGrid,
  readOnly = false,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
  onCrossGridUpdate,
  trackerContext: trackerContextProp,
}: TrackerKanbanGridProps) {
  const addable = !readOnly && (grid.config?.isRowAddAble ?? grid.config?.addable ?? true) !== false && onAddEntry != null
  const editable = !readOnly && grid.config?.isRowEditAble !== false
  const deleteable = !readOnly && (grid.config?.isRowDeletable ?? grid.config?.isRowDeleteAble) !== false && onDeleteEntries != null
  const canDrag = editable && onUpdate != null
  const thisGridRows = useMemo(
    () => gridDataForThisGrid ?? gridData[grid.id] ?? EMPTY_ROWS,
    [gridDataForThisGrid, gridData, grid.id]
  )
  const fullGridData = useMemo(
    () => ({ ...gridData, [grid.id]: thisGridRows }),
    [gridData, grid.id, thisGridRows]
  )
  const gridDataForKanban = useMemo(
    () => ({ ...fullGridData, [grid.id]: thisGridRows }),
    [fullGridData, thisGridRows, grid.id]
  )
  const trackerOptionsFromContext = useTrackerOptionsContext()
  const trackerContext = trackerOptionsFromContext ?? trackerContextProp

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null)
  const [cardFieldVisibility, setCardFieldVisibility] = useState<Record<string, boolean>>({})

  const { dependsOnForGrid } = useGridDependsOn(grid.id, dependsOn)
  const ks = useMemo(() => resolveKanbanStyles(styleOverrides), [styleOverrides])

  const kanbanState = useKanbanGroups({
    tabId,
    grid,
    layoutNodes,
    fields,
    bindings,
    validations,
    calculations,
    gridData: gridDataForKanban,
    trackerContext,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const groups = kanbanState?.groups ?? EMPTY_GROUPS
  const groupByFieldId = kanbanState?.groupByFieldId ?? ''
  const cardFieldsDisplay = kanbanState?.cardFieldsDisplay ?? []
  const fieldMetadata = kanbanState?.fieldMetadata ?? {}
  const fieldOrder = kanbanState?.fieldOrder ?? []
  const kanbanFields = kanbanState?.kanbanFields ?? EMPTY_FIELDS
  const rows = kanbanState?.rows ?? EMPTY_ROWS

  // Default: first 5 card fields visible (like data table column visibility)
  const effectiveCardVisibility = useMemo(() => {
    const next: Record<string, boolean> = { ...cardFieldVisibility }
    cardFieldsDisplay.forEach((f, i) => {
      if (next[f.id] === undefined) next[f.id] = i < 5
    })
    return next
  }, [cardFieldsDisplay, cardFieldVisibility])

  const visibleCardFields = useMemo(
    () => cardFieldsDisplay.filter((f) => effectiveCardVisibility[f.id]).slice(0, 5),
    [cardFieldsDisplay, effectiveCardVisibility]
  )

  const toggleCardFieldVisibility = useCallback((fieldId: string, visible: boolean) => {
    setCardFieldVisibility((prev) => ({ ...prev, [fieldId]: visible }))
  }, [])

  const groupedCards = useMemo(() => {
    const map = new Map<string, Array<Record<string, unknown> & { _originalIdx: number }>>()
    rows.forEach((row, idx) => {
      const key = String((row as Record<string, unknown>)[groupByFieldId] ?? '').trim()
      const card = { ...(row as Record<string, unknown>), _originalIdx: idx }
      const list = map.get(key)
      if (list) {
        list.push(card)
      } else {
        map.set(key, [card])
      }
    })
    return map
  }, [rows, groupByFieldId])

  const getCardSortId = useCallback(
    (card: Record<string, unknown> & { _originalIdx: number }, groupId: string) =>
      `${String(card.row_id ?? card.id ?? card._originalIdx)}-${groupId}`,
    []
  )

  const validGroupIds = useMemo(() => new Set(groups.map((g) => g.id)), [groups])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const resolveCardIndex = useCallback(
    (sortId: string): number => {
      const dashAt = sortId.indexOf('-')
      if (dashAt < 0) return -1
      const firstPart = sortId.slice(0, dashAt)
      const byRowId = rows.findIndex(
        (r) => (r as Record<string, unknown>).row_id === firstPart || String((r as Record<string, unknown>).id) === firstPart
      )
      if (byRowId >= 0) return byRowId
      const idx = parseInt(firstPart, 10)
      return !Number.isNaN(idx) && idx >= 0 && idx < rows.length ? idx : -1
    },
    [rows]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || !onUpdate) return

      const cardId = active.id as string
      const overId = String(over.id)
      const cardIdx = resolveCardIndex(cardId)
      if (cardIdx < 0) return

      const currentCard = rows[cardIdx]
      let nextGroupId = overId
      const firstDash = overId.indexOf('-')
      if (firstDash >= 0) nextGroupId = overId.slice(firstDash + 1)
      const nextGroupIdTrimmed = nextGroupId.trim()
      if (!validGroupIds.has(nextGroupIdTrimmed)) return

      const currentGroup = currentCard?.[groupByFieldId]
      if (String(currentGroup ?? '').trim() !== nextGroupIdTrimmed) {
        onUpdate(cardIdx, groupByFieldId, nextGroupIdTrimmed)

        // Apply bindings when group-by field changes (e.g. drag to another column)
        const groupingField = kanbanFields.find((f) => f.id === groupByFieldId)
        if (groupingField && (groupingField.dataType === 'options' || groupingField.dataType === 'multiselect')) {
          const binding = getBindingForField(grid.id, groupByFieldId, bindings, tabId)
          if (binding?.fieldMappings?.length) {
            const selectFieldPath = `${grid.id}.${groupByFieldId}`
            const optionRow = findOptionRow(fullGridData, binding, nextGroupIdTrimmed, selectFieldPath)
            if (optionRow) {
              const updates = applyBindings(binding, optionRow, selectFieldPath)
              for (const update of updates) {
                const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(update.targetPath)
                if (targetGridId && targetFieldId) {
                  if (onCrossGridUpdate) {
                    onCrossGridUpdate(targetGridId, cardIdx, targetFieldId, update.value)
                  } else if (targetGridId === grid.id) {
                    onUpdate(cardIdx, targetFieldId, update.value)
                  }
                }
              }
            }
          }
        }
      }
    },
    [
      groupByFieldId,
      rows,
      resolveCardIndex,
      onUpdate,
      onCrossGridUpdate,
      validGroupIds,
      kanbanFields,
      grid.id,
      bindings,
      tabId,
      fullGridData,
    ]
  )

  const getBindingUpdates = useCallback(
    (fieldId: string, value: unknown): Record<string, unknown> => {
      const binding = getBindingForField(grid.id, fieldId, bindings, tabId)
      if (!binding?.fieldMappings?.length) return {}
      const selectFieldPath = `${grid.id}.${fieldId}`
      const optionRow = findOptionRow(fullGridData, binding, value, selectFieldPath)
      if (!optionRow) return {}
      const updates = applyBindings(binding, optionRow, selectFieldPath)
      const result: Record<string, unknown> = {}
      for (const u of updates) {
        const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(u.targetPath)
        if (targetGridId === grid.id && targetFieldId) result[targetFieldId] = u.value
      }
      return result
    },
    [grid.id, bindings, tabId, fullGridData]
  )

  const handleEditSave = useCallback(
    (values: Record<string, unknown>) => {
      if (editRowIndex == null || !onUpdate) return
      Object.entries(values).forEach(([columnId, value]) => {
        onUpdate(editRowIndex, columnId, value)
      })
      Object.entries(values).forEach(([columnId, value]) => {
        const field = kanbanFields.find((f) => f.id === columnId)
        if (field && (field.dataType === 'options' || field.dataType === 'multiselect')) {
          const binding = getBindingForField(grid.id, columnId, bindings, tabId)
          if (binding?.fieldMappings?.length) {
            const selectFieldPath = `${grid.id}.${columnId}`
            const optionRow = findOptionRow(fullGridData, binding, value, selectFieldPath)
            if (optionRow) {
              const updates = applyBindings(binding, optionRow, selectFieldPath)
              for (const update of updates) {
                const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(update.targetPath)
                if (targetGridId && targetFieldId) {
                  if (onCrossGridUpdate) {
                    onCrossGridUpdate(targetGridId, editRowIndex, targetFieldId, update.value)
                  } else if (targetGridId === grid.id) {
                    onUpdate(editRowIndex, targetFieldId, update.value)
                  }
                }
              }
            }
          }
        }
      })
      setEditRowIndex(null)
    },
    [editRowIndex, onUpdate, onCrossGridUpdate, kanbanFields, grid.id, bindings, tabId, fullGridData]
  )

  const cardStyles = useMemo(
    () => ({
      cardPadding: ks.cardPadding,
      labelFontSize: ks.labelFontSize,
      valueFontSize: ks.fontSize,
      fontWeight: ks.fontWeight,
      valueTextColor: ks.textColor,
    }),
    [ks.cardPadding, ks.labelFontSize, ks.fontSize, ks.fontWeight, ks.textColor]
  )

  const activeCard = useMemo(() => {
    if (!activeId) return null
    const idx = resolveCardIndex(activeId)
    return idx >= 0 ? rows[idx] : null
  }, [activeId, rows, resolveCardIndex])

  const entryWays = useMemo(
    () => buildEntryWaysForGrid({ grid, tabId }),
    [grid, tabId]
  )

  if (!kanbanState) {
    if (layoutNodes.filter((node) => node.gridId === grid.id).length === 0) return null
    return (
      <div className="text-muted-foreground text-sm">
        Kanban view requires a grouping field (check grid config or ensure an options/multiselect field exists)
      </div>
    )
  }

  const content = (
    <div className="w-full space-y-4">
      {(addable || cardFieldsDisplay.length > 0) && (
        <>
          <div className="flex justify-end items-center gap-2">
            {cardFieldsDisplay.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                    aria-label="Card preview fields"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-[300px]"
                  onInteractOutside={(e) => e.preventDefault()}
                >
                  <DialogHeader>
                    <DialogTitle>Card preview fields</DialogTitle>
                  </DialogHeader>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Choose which fields to show on cards (up to 5).
                  </p>
                  <div className="py-2 max-h-[50vh] overflow-y-auto pr-2 space-y-2">
                    {cardFieldsDisplay.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`card-field-${field.id}`}
                          checked={effectiveCardVisibility[field.id] ?? false}
                          onCheckedChange={(checked) =>
                            toggleCardFieldVisibility(field.id, !!checked)
                          }
                        />
                        <label
                          htmlFor={`card-field-${field.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {addable && (
              <EntryWayButton
                onNewEntryClick={() => setShowAddDialog(true)}
                entryWays={entryWays}
                // For now, Entry Ways are just visible options; clicking does not create rows yet.
                onSelectEntryWay={() => {}}
                disabled={!onAddEntry}
              />
            )}
          </div>

          {addable && (
            <EntryFormDialog
              open={showAddDialog}
              onOpenChange={setShowAddDialog}
              title="Add New Entry"
              submitLabel="Add Entry"
              fieldMetadata={fieldMetadata}
              fieldOrder={fieldOrder}
              initialValues={
                groupByFieldId && groups.length > 0
                  ? { [groupByFieldId]: (groups.find((g) => g.id !== '') ?? groups[0])?.id ?? '' }
                  : {}
              }
              onSave={(values) => {
                onAddEntry(values)
                setShowAddDialog(false)
              }}
              onSaveAnother={(values) => onAddEntry(values)}
              getBindingUpdates={getBindingUpdates}
              getFieldOverrides={(values, fieldId) =>
                resolveDependsOnOverrides(dependsOnForGrid, fullGridData, grid.id, 0, values)[fieldId]
              }
              gridId={grid.id}
              calculations={calculations}
            />
          )}
        </>
      )}

      {editable && (
        <EntryFormDialog
          open={editRowIndex !== null}
          onOpenChange={(open) => !open && setEditRowIndex(null)}
          title="Row Details"
          submitLabel="Update Entry"
          fieldMetadata={fieldMetadata}
          fieldOrder={fieldOrder}
          initialValues={editRowIndex != null ? rows[editRowIndex] ?? {} : {}}
          onSave={handleEditSave}
          getBindingUpdates={getBindingUpdates}
          getFieldOverrides={(values, fieldId) =>
            resolveDependsOnOverrides(
              dependsOnForGrid,
              fullGridData,
              grid.id,
              editRowIndex ?? 0,
              values
            )[fieldId]
          }
          gridId={grid.id}
          calculations={calculations}
        />
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {groups.map((group) => {
          const cardsInGroup = groupedCards.get(group.id) ?? []

          return (
            <div key={group.id} className="shrink-0" style={{ width: `${ks.columnWidth}px` }}>
              <div className="bg-muted/50 border border-border/40 rounded-lg px-4 py-3 mb-3">
                <h3 className="font-medium text-foreground text-sm flex items-center justify-between gap-2">
                  <span className="truncate">{group.label || 'Uncategorized'}</span>
                  <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md shrink-0 tabular-nums">
                    {cardsInGroup.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-3 min-h-[100px] flex flex-col">
                {canDrag ? (
                  <SortableContext
                    id={group.id}
                    items={cardsInGroup.map((c) => getCardSortId(c, group.id))}
                    strategy={verticalListSortingStrategy}
                  >
                    {cardsInGroup.length === 0 ? (
                      <DroppableEmptyColumn id={group.id} />
                    ) : (
                      <>
                        {cardsInGroup.map((card) => {
                          const sortId = getCardSortId(card, group.id)
                          return (
                            <SortableKanbanCard
                              key={sortId}
                              id={sortId}
                              card={card}
                              cardFields={visibleCardFields}
                              gridId={grid.id}
                              gridData={gridDataForKanban}
                              dependsOn={dependsOnForGrid}
                              fieldMetadata={fieldMetadata}
                              onEditRow={editable ? setEditRowIndex : undefined}
                              onDeleteRow={
                                deleteable && onDeleteEntries
                                  ? () => onDeleteEntries([card._originalIdx])
                                  : undefined
                              }
                              styles={cardStyles}
                            />
                          )
                        })}
                        <ColumnDropZone id={group.id} />
                      </>
                    )}
                  </SortableContext>
                ) : cardsInGroup.length === 0 ? (
                  <div className="text-xs text-muted-foreground/70 px-2 py-2">No entries</div>
                ) : (
                  cardsInGroup.map((card) => (
                    <KanbanCard
                      key={`${group.id}-${card.row_id ?? card.id ?? card._originalIdx ?? 'row'}`}
                      card={card}
                      cardFields={visibleCardFields}
                      gridId={grid.id}
                      gridData={gridDataForKanban}
                      dependsOn={dependsOnForGrid}
                      fieldMetadata={fieldMetadata}
                      styles={cardStyles}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  if (!canDrag) {
    return content
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {content}
      <DragOverlay
        dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.5' } },
          }),
        }}
      >
        {activeCard ? (
          <KanbanCard
            card={activeCard as Record<string, unknown> & { _originalIdx?: number }}
            cardFields={visibleCardFields}
            gridId={grid.id}
            gridData={gridDataForKanban}
            dependsOn={dependsOnForGrid}
            fieldMetadata={fieldMetadata}
            isOverlay
            styles={cardStyles}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export const TrackerKanbanGrid = memo(TrackerKanbanGridInner)
