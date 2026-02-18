'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
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
import type { FieldValidationRule } from '@/lib/functions/types'

export interface TrackerKanbanGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  validations?: Record<string, FieldValidationRule[]>
  styleOverrides?: StyleOverrides
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
  onCrossGridUpdate?: (gridId: string, rowIndex: number, fieldId: string, value: unknown) => void
  trackerContext?: TrackerContextForOptions
}

export function TrackerKanbanGrid({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings = {},
  validations,
  styleOverrides,
  dependsOn,
  gridData = {},
  onUpdate,
  onAddEntry,
  onCrossGridUpdate,
  trackerContext: trackerContextProp,
}: TrackerKanbanGridProps) {
  const trackerOptionsFromContext = useTrackerOptionsContext()
  const trackerContext = trackerOptionsFromContext ?? trackerContextProp

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null)

  const { dependsOnForGrid } = useGridDependsOn(grid.id, dependsOn)
  const ks = useMemo(() => resolveKanbanStyles(styleOverrides), [styleOverrides])

  const kanbanState = useKanbanGroups({
    tabId,
    grid,
    layoutNodes,
    fields,
    bindings,
    validations,
    gridData,
    trackerContext,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!kanbanState) {
    if (layoutNodes.filter((n) => n.gridId === grid.id).length === 0) return null
    return (
      <div className="text-muted-foreground text-sm">
        Kanban view requires a grouping field (check grid config or ensure an options/multiselect field exists)
      </div>
    )
  }

  const {
    groups,
    groupByFieldId,
    cardFieldsDisplay,
    fieldMetadata,
    fieldOrder,
    kanbanFields,
    rows,
  } = kanbanState

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || !onUpdate) return

      const cardId = active.id as string
      const overId = String(over.id)
      const dashAt = cardId.indexOf('-')
      if (dashAt < 0) return
      const cardIdx = parseInt(cardId.slice(0, dashAt), 10)
      if (Number.isNaN(cardIdx) || cardIdx < 0 || cardIdx >= rows.length) return

      const currentCard = rows[cardIdx]
      let nextGroupId = overId
      const firstDash = overId.indexOf('-')
      if (firstDash >= 0) nextGroupId = overId.slice(firstDash + 1)
      const nextGroupIdTrimmed = nextGroupId.trim()
      const validGroupIds = new Set(groups.map((g) => g.id))
      if (!validGroupIds.has(nextGroupIdTrimmed)) return

      const currentGroup = currentCard?.[groupByFieldId]
      if (String(currentGroup ?? '').trim() !== nextGroupIdTrimmed) {
        onUpdate(cardIdx, groupByFieldId, nextGroupIdTrimmed)
      }
    },
    [groups, groupByFieldId, rows, onUpdate]
  )

  const getBindingUpdates = useCallback(
    (fieldId: string, value: unknown): Record<string, unknown> => {
      const binding = getBindingForField(grid.id, fieldId, bindings, tabId)
      if (!binding?.fieldMappings?.length) return {}
      const selectFieldPath = `${grid.id}.${fieldId}`
      const optionRow = findOptionRow(gridData, binding, value, selectFieldPath)
      if (!optionRow) return {}
      const updates = applyBindings(binding, optionRow, selectFieldPath)
      const result: Record<string, unknown> = {}
      for (const u of updates) {
        const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(u.targetPath)
        if (targetGridId === grid.id && targetFieldId) result[targetFieldId] = u.value
      }
      return result
    },
    [grid.id, bindings, tabId, gridData]
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
            const optionRow = findOptionRow(gridData, binding, value, selectFieldPath)
            if (optionRow) {
              const updates = applyBindings(binding, optionRow, selectFieldPath)
              for (const update of updates) {
                const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(update.targetPath)
                if (targetGridId && targetFieldId) {
                  onCrossGridUpdate
                    ? onCrossGridUpdate(targetGridId, editRowIndex, targetFieldId, update.value)
                    : targetGridId === grid.id && onUpdate(editRowIndex, targetFieldId, update.value)
                }
              }
            }
          }
        }
      })
      setEditRowIndex(null)
    },
    [editRowIndex, onUpdate, onCrossGridUpdate, kanbanFields, grid.id, bindings, tabId, gridData]
  )

  const cardStyles = {
    cardPadding: ks.cardPadding,
    labelFontSize: ks.labelFontSize,
    valueFontSize: ks.fontSize,
    fontWeight: ks.fontWeight,
    valueTextColor: ks.textColor,
  }

  const activeCard = activeId ? rows[parseInt(activeId.split('-')[0], 10)] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full space-y-4">
        {onAddEntry != null && (
          <>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowAddDialog(true)}
                className="font-medium"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Entry
              </Button>
            </div>

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
                resolveDependsOnOverrides(dependsOnForGrid, gridData, grid.id, 0, values)[fieldId]
              }
            />
          </>
        )}

        <EntryFormDialog
          open={editRowIndex !== null}
          onOpenChange={(open) => !open && setEditRowIndex(null)}
          title="Row Details"
          submitLabel="Update Entry"
          fieldMetadata={fieldMetadata}
          fieldOrder={fieldOrder}
          initialValues={editRowIndex != null ? rows[editRowIndex] ?? {} : {}}
          onSave={handleEditSave}
          getFieldOverrides={(values, fieldId) =>
            resolveDependsOnOverrides(
              dependsOnForGrid,
              gridData,
              grid.id,
              editRowIndex ?? 0,
              values
            )[fieldId]
          }
        />

        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {groups.map((group) => {
            const cardsInGroup = rows
              .map((ex, idx) => ({ ...ex, _originalIdx: idx } as Record<string, unknown> & { _originalIdx: number }))
              .filter((ex) => String(ex[groupByFieldId] ?? '').trim() === group.id)

            return (
              <div key={group.id} className="shrink-0" style={{ width: `${ks.columnWidth}px` }}>
                <div className="bg-muted/70 rounded-md p-4 mb-4">
                  <h3 className="font-semibold text-foreground flex items-center justify-between">
                    {group.label}
                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                      {cardsInGroup.length}
                    </span>
                  </h3>
                </div>
                <div className="space-y-3 min-h-[100px] flex flex-col">
                  <SortableContext
                    id={group.id}
                    items={cardsInGroup.map((c) => `${(c as Record<string, unknown> & { _originalIdx: number })._originalIdx}-${group.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {cardsInGroup.length === 0 ? (
                      <DroppableEmptyColumn id={group.id} />
                    ) : (
                      <>
                        {cardsInGroup.map((card) => {
                          const idx = (card as Record<string, unknown> & { _originalIdx: number })._originalIdx
                          const sortId = `${idx}-${group.id}`
                          return (
                            <SortableKanbanCard
                              key={sortId}
                              id={sortId}
                              card={card as Record<string, unknown> & { _originalIdx: number }}
                              cardFields={cardFieldsDisplay}
                              tabId={tabId}
                              gridId={grid.id}
                              bindings={bindings}
                              gridData={gridData}
                              fields={fields}
                              dependsOn={dependsOnForGrid}
                              trackerContext={trackerContext ?? undefined}
                              onEditRow={setEditRowIndex}
                              styles={cardStyles}
                            />
                          )
                        })}
                        <ColumnDropZone id={group.id} />
                      </>
                    )}
                  </SortableContext>
                </div>
              </div>
            )
          })}
        </div>
      </div>

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
            cardFields={cardFieldsDisplay}
            tabId={tabId}
            gridId={grid.id}
            bindings={bindings}
            gridData={gridData}
            fields={fields}
            dependsOn={dependsOnForGrid}
            trackerContext={trackerContext ?? undefined}
            isOverlay
            styles={cardStyles}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
