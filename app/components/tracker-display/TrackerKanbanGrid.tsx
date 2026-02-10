import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrackerGrid,
  TrackerFieldType,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
} from './types'
import { TrackerCell } from './TrackerCell'
import { resolveFieldOptionsV2 } from '@/lib/resolve-options'
import { getBindingForField, findOptionRow, applyBindings, parsePath } from '@/lib/resolve-bindings'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import { EntryFormDialog } from '@/components/ui/data-table/entry-form-dialog'
import { ChevronDown, Plus } from 'lucide-react'
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { resolveKanbanStyles } from '@/lib/style-utils'

interface TrackerKanbanGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  /** Optional style overrides for this kanban view. */
  styleOverrides?: StyleOverrides
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
  onCrossGridUpdate?: (gridId: string, rowIndex: number, fieldId: string, value: unknown) => void
}

function SortableCard({
  id,
  card,
  cardFields,
  tabId,
  gridId,
  bindings,
  gridData,
  fields,
  onEditRow,
  cardPadding,
  labelFontSize,
  valueFontSize,
  fontWeight,
  valueTextColor,
}: {
  id: string
  card: Record<string, unknown> & { _originalIdx?: number }
  cardFields: Array<{ id: string; dataType: TrackerFieldType; label: string }>
  tabId: string
  gridId: string
  bindings: TrackerBindings
  gridData: Record<string, Array<Record<string, unknown>>>
  fields: TrackerField[]
  onEditRow?: (rowIndex: number) => void
  cardPadding?: string
  labelFontSize?: string
  valueFontSize?: string
  fontWeight?: string
  valueTextColor?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.0 : 1, // Completely hide while dragging to show only overlay
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard
        card={card}
        cardFields={cardFields}
        tabId={tabId}
        gridId={gridId}
        bindings={bindings}
        gridData={gridData}
        fields={fields}
        onEditRow={onEditRow}
        cardPadding={cardPadding}
        labelFontSize={labelFontSize}
        valueFontSize={valueFontSize}
        fontWeight={fontWeight}
        valueTextColor={valueTextColor}
      />
    </div>
  )
}


function KanbanCard({
  card,
  cardFields,
  tabId,
  gridId,
  bindings,
  gridData,
  fields,
  isOverlay = false,
  onEditRow,
  cardPadding,
  labelFontSize,
  valueFontSize,
  fontWeight,
  valueTextColor,
}: {
  card: Record<string, unknown> & { _originalIdx?: number }
  cardFields: Array<{ id: string; dataType: TrackerFieldType; label: string }>
  tabId: string
  gridId: string
  bindings: TrackerBindings
  gridData: Record<string, Array<Record<string, unknown>>>
  fields: TrackerField[]
  isOverlay?: boolean
  onEditRow?: (rowIndex: number) => void
  cardPadding?: string
  labelFontSize?: string
  valueFontSize?: string
  fontWeight?: string
  valueTextColor?: string
}) {
  const rowIndex = card._originalIdx
  const showEditButton = !isOverlay && onEditRow != null && typeof rowIndex === 'number'

  return (
    <Card
      className={`${cardPadding ?? 'p-4'} bg-card border-border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing relative ${isOverlay ? 'shadow-xl' : ''} ${fontWeight ?? ''}`}
    >
      {showEditButton && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onEditRow?.(rowIndex)
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ChevronDown className="h-4 w-4" />
          <span className="sr-only">Edit entry</span>
        </Button>
      )}
      {cardFields.map((field) => {
        const fullField = fields.find((f) => f.id === field.id)
        const options = fullField
          ? resolveFieldOptionsV2(tabId, gridId, fullField, bindings, gridData)
          : undefined
        return (
          <div key={field.id} className="mb-2 last:mb-0">
            <p className={`${labelFontSize ?? 'text-xs'} text-muted-foreground font-medium`}>
              {field.label}
            </p>
            <div className={`${valueFontSize ?? 'text-sm'} ${valueTextColor ?? 'text-foreground'}`}>
              <TrackerCell
                value={card[field.id]}
                type={field.dataType}
                options={options}
              />
            </div>
          </div>
        )
      })}
    </Card>
  )
}

function DroppableEmptyColumn({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`h-24 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center ${isOver ? 'border-primary bg-primary/5' : 'border-muted bg-muted/20'
        }`}
    >
      <p className="text-xs text-muted-foreground text-center px-4">Drop here</p>
    </div>
  )
}

function ColumnDropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-lg border-2 border-dashed transition-colors flex items-center justify-center flex-shrink-0 ${isOver ? 'border-primary bg-primary/10' : 'border-muted/50 bg-muted/10'
        }`}
    >
      <p className="text-xs text-muted-foreground">{isOver ? 'Drop here' : ''}</p>
    </div>
  )
}

export function TrackerKanbanGrid({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings = {},
  styleOverrides,
  gridData = {},
  onUpdate,
  onAddEntry,
  onCrossGridUpdate,
}: TrackerKanbanGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null)
  const ks = useMemo(() => resolveKanbanStyles(styleOverrides), [styleOverrides])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const connectedFieldNodes = layoutNodes
    .filter(n => n.gridId === grid.id)
    .sort((a, b) => a.order - b.order)

  const kanbanFields = connectedFieldNodes
    .map(node => fields.find(f => f.id === node.fieldId))
    .filter((f): f is TrackerField => !!f && !f.config?.isHidden)

  if (kanbanFields.length === 0) {
    if (layoutNodes.length === 0) return null
    return <div className="p-4 text-muted-foreground">Empty Kanban (No Fields linked)</div>
  }

  const rows = gridData[grid.id] ?? []

  let groupByFieldId = grid.config?.groupBy

  if (!groupByFieldId) {
    const optionField = kanbanFields.find(f => f.dataType === 'options' || f.dataType === 'multiselect')
    if (optionField) groupByFieldId = optionField.id
  }

  if (!groupByFieldId) {
    return (
      <div className="text-muted-foreground text-sm">
        Kanban view requires a grouping field (check grid config or ensure an options/multiselect field exists)
      </div>
    )
  }

  const groupingField = kanbanFields.find(f => f.id === groupByFieldId)

  let groups: Array<{ id: string, label: string }> = []

  const options = resolveFieldOptionsV2(tabId, grid.id, groupingField!, bindings, gridData)

  const toOptionId = (o: { id?: string; value?: unknown; label?: string }) =>
    String(o.id ?? o.value ?? o.label ?? '').trim()
  if (options && options.length > 0) {
    groups = options.map(o => ({
      id: toOptionId(o),
      label: o.label ?? '',
    }))
  } else {
    const distinctValues = Array.from(new Set(rows.map(r => String(r[groupByFieldId!] ?? ''))))
    groups = distinctValues.filter(Boolean).map(v => ({ id: v, label: v }))
  }

  if (groups.length === 0) {
    groups = [{ id: '', label: 'Uncategorized' }]
  }
  const hasEmptyGroup = groups.some(g => g.id === '')
  if (!hasEmptyGroup) {
    groups = [...groups, { id: '', label: 'Uncategorized' }]
  }
  const seenIds = new Set<string>()
  groups = groups.filter(g => {
    if (seenIds.has(g.id)) return false
    seenIds.add(g.id)
    return true
  })

  const cardFieldsDisplay = kanbanFields
    .filter(f => f.id !== groupByFieldId)
    .map(f => ({ id: f.id, dataType: f.dataType, label: f.ui.label }))

  const fieldMetadata: FieldMetadata = {}
  kanbanFields.forEach((field) => {
    const opts = resolveFieldOptionsV2(tabId, grid.id, field, bindings, gridData)
    fieldMetadata[field.id] = {
      name: field.ui.label,
      type: field.dataType,
      options: opts?.map((o) => ({ id: toOptionId(o), label: o.label ?? '' })),
      config: field.config,
    }
  })
  const fieldOrder = kanbanFields.map((f) => f.id)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
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
    if (firstDash >= 0) {
      nextGroupId = overId.slice(firstDash + 1)
    }

    const nextGroupIdTrimmed = nextGroupId.trim()
    const validGroupIds = new Set(groups.map(g => g.id))
    if (!validGroupIds.has(nextGroupIdTrimmed)) return

    const currentGroup = currentCard?.[groupByFieldId!]
    if (String(currentGroup ?? '').trim() !== nextGroupIdTrimmed) {
      onUpdate(cardIdx, groupByFieldId!, nextGroupIdTrimmed)
    }
  }

  const activeCard = activeId ? rows[parseInt(activeId.split('-')[0])] : null

  const handleAddSaveAndClose = (values: Record<string, unknown>) => {
    onAddEntry?.(values)
    setShowAddDialog(false)
  }

  const handleAddSaveAndStayOpen = (values: Record<string, unknown>) => {
    onAddEntry?.(values)
    // Keep the dialog open for the next entry; EntryFormDialog will reset its form state.
  }

  /** For Add Entry dialog: when a select/multiselect changes, return binding updates to merge into form. */
  const getBindingUpdates = (fieldId: string, value: unknown): Record<string, unknown> => {
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
  }

  const handleEditSave = (values: Record<string, unknown>) => {
    if (editRowIndex == null || !onUpdate) return

    Object.entries(values).forEach(([columnId, value]) => {
      onUpdate(editRowIndex, columnId, value)
    })

    Object.entries(values).forEach(([columnId, value]) => {
      const field = kanbanFields.find((f) => f.id === columnId)
      if (field && (field.dataType === 'options' || field.dataType === 'multiselect')) {
        const binding = getBindingForField(grid.id, columnId, bindings, tabId)
        if (binding && binding.fieldMappings.length > 0) {
          const selectFieldPath = `${grid.id}.${columnId}`
          const optionRow = findOptionRow(gridData, binding, value, selectFieldPath)
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
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full space-y-4">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowAddDialog(true)}
            className="shadow-sm font-medium"
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
          onSave={handleAddSaveAndClose}
          onSaveAnother={handleAddSaveAndStayOpen}
          getBindingUpdates={getBindingUpdates}
        />
        <EntryFormDialog
          open={editRowIndex !== null}
          onOpenChange={(open) => !open && setEditRowIndex(null)}
          title="Row Details"
          submitLabel="Update Entry"
          fieldMetadata={fieldMetadata}
          fieldOrder={fieldOrder}
          initialValues={editRowIndex != null ? rows[editRowIndex] ?? {} : {}}
          onSave={handleEditSave}
        />
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {groups.map((group) => {
            const cardsInGroup = rows
              .map((ex, idx) => ({ ...ex, _originalIdx: idx } as Record<string, unknown> & { _originalIdx: number }))
              .filter((ex) => String(ex[groupByFieldId!] ?? '').trim() === group.id)

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
                    items={cardsInGroup.map(c => `${c._originalIdx}-${group.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {cardsInGroup.length === 0 ? (
                      <DroppableEmptyColumn id={group.id} />
                    ) : (
                      <>
                        {cardsInGroup.map((card) => (
                          <SortableCard
                            key={`${card._originalIdx}-${group.id}`}
                            id={`${card._originalIdx}-${group.id}`}
                            card={card}
                            cardFields={cardFieldsDisplay}
                            tabId={tabId}
                            gridId={grid.id}
                            bindings={bindings}
                            gridData={gridData}
                            fields={fields}
                            onEditRow={setEditRowIndex}
                            cardPadding={ks.cardPadding}
                            labelFontSize={ks.labelFontSize}
                            valueFontSize={ks.fontSize}
                            fontWeight={ks.fontWeight}
                            valueTextColor={ks.textColor}
                          />
                        ))}
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
      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeCard ? (
          <KanbanCard
            card={activeCard}
            cardFields={cardFieldsDisplay}
            tabId={tabId}
            gridId={grid.id}
            bindings={bindings}
            gridData={gridData}
            fields={fields}
            isOverlay
            cardPadding={ks.cardPadding}
            labelFontSize={ks.labelFontSize}
            valueFontSize={ks.fontSize}
            fontWeight={ks.fontWeight}
            valueTextColor={ks.textColor}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
