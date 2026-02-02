import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrackerGrid,
  TrackerFieldType,
  TrackerField,
  TrackerLayoutNode,
  TrackerOptionMap,
  TrackerOptionTable,
} from './types'
import { TrackerCell } from './tracker-cell'
import { resolveFieldOptions } from './resolve-options'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import { EntryFormDialog } from '@/components/ui/data-table/entry-form-dialog'
import { ChevronDown } from 'lucide-react'
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
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'

interface TrackerKanbanGridProps {
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  optionTables: TrackerOptionTable[]
  optionMaps?: TrackerOptionMap[]
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
}

function SortableCard({
  id,
  card,
  cardFields,
  optionTables,
  optionMaps,
  gridData,
  fields,
  onEditRow,
}: {
  id: string
  card: Record<string, unknown> & { _originalIdx?: number }
  cardFields: Array<{ id: string; dataType: TrackerFieldType; label: string }>
  optionTables: TrackerOptionTable[]
  optionMaps: TrackerOptionMap[]
  gridData: Record<string, Array<Record<string, unknown>>>
  fields: TrackerField[]
  onEditRow?: (rowIndex: number) => void
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
        optionTables={optionTables}
        optionMaps={optionMaps}
        gridData={gridData}
        fields={fields}
        onEditRow={onEditRow}
      />
    </div>
  )
}


function KanbanCard({
  card,
  cardFields,
  optionTables,
  optionMaps,
  gridData,
  fields,
  isOverlay = false,
  onEditRow,
}: {
  card: Record<string, unknown> & { _originalIdx?: number }
  cardFields: Array<{ id: string; dataType: TrackerFieldType; label: string }>
  optionTables: TrackerOptionTable[]
  optionMaps: TrackerOptionMap[]
  gridData: Record<string, Array<Record<string, unknown>>>
  fields: TrackerField[]
  isOverlay?: boolean
  onEditRow?: (rowIndex: number) => void
}) {
  const rowIndex = card._originalIdx
  const showEditButton = !isOverlay && onEditRow != null && typeof rowIndex === 'number'

  return (
    <Card
      className={`p-4 bg-card border-border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing relative ${isOverlay ? 'shadow-xl' : ''}`}
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
          ? resolveFieldOptions(fullField, optionTables, optionMaps, gridData)
          : undefined
        return (
          <div key={field.id} className="mb-2 last:mb-0">
            <p className="text-xs text-muted-foreground font-medium">
              {field.label}
            </p>
            <div className="text-sm text-foreground">
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

/** Drop zone for empty column */
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

/** Drop zone for empty space below cards - must have min height so collision detection finds it */
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
  grid,
  layoutNodes,
  fields,
  optionTables,
  optionMaps = [],
  gridData = {},
  onUpdate,
  onAddEntry,
}: TrackerKanbanGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null)

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

  // Determine grouping field
  let groupByFieldId = grid.config?.groupBy

  if (!groupByFieldId) {
    // Fallback: finding first options field
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

  // Try to find explicit options if available (optionMapId or optionTableId)
  const options = resolveFieldOptions(groupingField!, optionTables, optionMaps, gridData)

  // Use same key as form/store so row[groupByFieldId] matches group.id (must match fieldMetadata option id below)
  const toOptionId = (o: { id?: string; value?: unknown; label?: string }) =>
    String(o.id ?? o.value ?? o.label ?? '').trim()
  if (options && options.length > 0) {
    groups = options.map(o => ({
      id: toOptionId(o),
      label: o.label ?? '',
    }))
  } else {
    // Distinct values from rows as fallback
    const distinctValues = Array.from(new Set(rows.map(r => String(r[groupByFieldId!] ?? ''))))
    groups = distinctValues.filter(Boolean).map(v => ({ id: v, label: v }))
  }

  // When no groups (e.g. empty data, no options), show at least one column
  if (groups.length === 0) {
    groups = [{ id: '', label: 'Uncategorized' }]
  }
  // Always include a fallback for rows with empty/undefined groupBy (e.g. newly added entries)
  const hasEmptyGroup = groups.some(g => g.id === '')
  if (!hasEmptyGroup) {
    groups = [...groups, { id: '', label: 'Uncategorized' }]
  }
  // Dedupe by id so each column has a unique id and drops always match exactly one column
  const seenIds = new Set<string>()
  groups = groups.filter(g => {
    if (seenIds.has(g.id)) return false
    seenIds.add(g.id)
    return true
  })

  // Fields to display on card (simple mapping for display)
  // Mapping to format expected by KanbanCard: { id, dataType, label }
  const cardFieldsDisplay = kanbanFields
    .filter(f => f.id !== groupByFieldId)
    .map(f => ({ id: f.id, dataType: f.dataType, label: f.ui.label }))

  // Field metadata for Add/Edit dialog (same shape as table)
  const fieldMetadata: FieldMetadata = {}
  kanbanFields.forEach((field) => {
    const opts = resolveFieldOptions(field, optionTables, optionMaps, gridData)
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

    // cardId is in format `idx-currentGroup` (e.g. "0-todo")
    const dashAt = cardId.indexOf('-')
    if (dashAt < 0) return
    const cardIdx = parseInt(cardId.slice(0, dashAt), 10)
    if (Number.isNaN(cardIdx) || cardIdx < 0 || cardIdx >= rows.length) return

    const currentCard = rows[cardIdx]

    // overId is either: (1) group.id when dropping on empty column, or (2) card id "rowIndex-groupId"
    let nextGroupId = overId
    const firstDash = overId.indexOf('-')
    if (firstDash >= 0) {
      // Dropped on another card: overId is "rowIndex-groupId" (groupId may contain hyphens)
      nextGroupId = overId.slice(firstDash + 1)
    }

    // Only update if the drop target is a valid column id (so the card doesn't "disappear")
    const nextGroupIdTrimmed = nextGroupId.trim()
    const validGroupIds = new Set(groups.map(g => g.id))
    if (!validGroupIds.has(nextGroupIdTrimmed)) return

    const currentGroup = currentCard?.[groupByFieldId!]
    if (String(currentGroup ?? '').trim() !== nextGroupIdTrimmed) {
      onUpdate(cardIdx, groupByFieldId!, nextGroupIdTrimmed)
    }
  }

  const activeCard = activeId ? rows[parseInt(activeId.split('-')[0])] : null

  const handleAddSave = (values: Record<string, unknown>) => {
    onAddEntry?.(values)
    setShowAddDialog(false)
  }

  const handleEditSave = (values: Record<string, unknown>) => {
    if (editRowIndex == null || !onUpdate) return
    Object.entries(values).forEach(([columnId, value]) => {
      onUpdate(editRowIndex, columnId, value)
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
            variant="outline"
            onClick={() => setShowAddDialog(true)}
          >
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
          onSave={handleAddSave}
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
              <div key={group.id} className="shrink-0 w-80">
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
                            optionTables={optionTables}
                            optionMaps={optionMaps}
                            gridData={gridData}
                            fields={fields}
                            onEditRow={setEditRowIndex}
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
            optionTables={optionTables}
            optionMaps={optionMaps}
            gridData={gridData}
            fields={fields}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
