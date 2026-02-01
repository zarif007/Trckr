import { Card } from '@/components/ui/card'
import {
  TrackerGrid,
  TrackerFieldType,
  TrackerField,
  TrackerLayoutNode,
  TrackerOptionTable,
} from './types'
import { TrackerCell } from './tracker-cell'
import {
  DndContext,
  DragOverlay,
  closestCorners,
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
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
}

function SortableCard({
  id,
  card,
  cardFields,
  optionTables,
}: {
  id: string
  card: Record<string, unknown>
  cardFields: Array<{ id: string; dataType: TrackerFieldType; label: string; }>
  optionTables: TrackerOptionTable[]
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
      <KanbanCard card={card} cardFields={cardFields} optionTables={optionTables} />
    </div>
  )
}


function KanbanCard({
  card,
  cardFields,
  optionTables,
  isOverlay = false,
}: {
  card: Record<string, unknown>
  cardFields: Array<{ id: string; dataType: TrackerFieldType; label: string; }>
  optionTables: TrackerOptionTable[]
  isOverlay?: boolean
}) {
  return (
    <Card
      className={`p-4 bg-card border-border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${isOverlay ? 'shadow-xl' : ''}`}
    >
      {cardFields.map((field) => {
         // Resolve options if needed (similar to other grids)
         // Assuming collection fields might simple, but for proper display we need options
         // Since generic collection field doesn't map options easily, we might need a workaround or assume standard mapping?
         // For now, pass undefined or minimal options.
         return (
            <div key={field.id} className="mb-2 last:mb-0">
            <p className="text-xs text-muted-foreground font-medium">
                {field.label}
            </p>
            <div className="text-sm text-foreground">
                <TrackerCell
                value={card[field.id]}
                type={field.dataType}
                // options={...}
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
      <p className="text-xs text-muted-foreground text-center px-4">
        Drop here
      </p>
    </div>
  )
}

export function TrackerKanbanGrid({ 
    grid,
    layoutNodes,
    fields,
    optionTables,
    gridData = {},
    onUpdate 
}: TrackerKanbanGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

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
  if (rows.length === 0) return null

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
  
  // Try to find explicit options if available
  const options = resolveFieldOptions(groupingField!, optionTables, groupingField?.config?.optionsMappingId)
  
  if (options && options.length > 0) {
      groups = options.map(o => ({ id: String(o.value ?? o.id ?? o.label), label: o.label }))
  } else {
      // Distinct values from rows as fallback
      const distinctValues = Array.from(new Set(rows.map(r => String(r[groupByFieldId!] ?? 'Uncategorized'))))
      groups = distinctValues.map(v => ({ id: v, label: v }))
  }

  // Fields to display on card (simple mapping for display)
  // Mapping to format expected by KanbanCard: { id, dataType, label }
  const cardFieldsDisplay = kanbanFields
    .filter(f => f.id !== groupByFieldId)
    .map(f => ({ id: f.id, dataType: f.dataType, label: f.ui.label }))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (!over) return

    const cardId = active.id as string
    const overId = over.id as string

    // cardId is in format `idx-currentGroup`
    const [cardIdxStr] = cardId.split('-')
    const cardIdx = parseInt(cardIdxStr)
    const currentCard = rows[cardIdx]

    // overId can be a group ID (if dropping into an empty column) or another card's ID
    let nextGroupId = overId
    if (overId.includes('-')) {
      const parts = overId.split('-')
      // If it's a card ID, the group ID is the last part
      nextGroupId = parts[parts.length - 1]
    }

    const currentGroup = currentCard?.[groupByFieldId!]
    if (String(currentGroup ?? '') !== nextGroupId && onUpdate) {
      onUpdate(cardIdx, groupByFieldId!, nextGroupId)
    }
  }

  const activeCard = activeId ? rows[parseInt(activeId.split('-')[0])] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {groups.map((group) => {
          const cardsInGroup = rows
            .map((ex, idx) => ({ ...ex, _originalIdx: idx } as Record<string, unknown> & { _originalIdx: number }))
            .filter((ex) => String(ex[groupByFieldId!] ?? '') === group.id)

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

              <SortableContext
                id={group.id}
                items={cardsInGroup.map(c => `${c._originalIdx}-${group.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 min-h-[100px]">
                  {cardsInGroup.length === 0 ? (
                    <DroppableEmptyColumn id={group.id} />
                  ) : (
                    cardsInGroup.map((card) => (
                      <SortableCard
                        key={`${card._originalIdx}-${group.id}`}
                        id={`${card._originalIdx}-${group.id}`}
                        card={card}
                        cardFields={cardFieldsDisplay}
                        optionTables={optionTables}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>
          )
        })}
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
          <KanbanCard card={activeCard} cardFields={cardFieldsDisplay} optionTables={optionTables} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
// Helper to look up options from optionTables (Duplicated from table grid or shared?)
// Ideally should be imported. For now defining locally or assuming it's available.
// I need to make sure resolveFieldOptions is available or implemented here. 
function resolveFieldOptions(
    field: TrackerField,
    optionTables: TrackerOptionTable[],
    optionsMappingId?: string
) {
    if (field.dataType !== 'options' && field.dataType !== 'multiselect') return undefined
    if (!optionsMappingId) return undefined
    
    const table = optionTables.find(t => t.id === optionsMappingId)
    if (!table) return undefined
    return table.options
}
