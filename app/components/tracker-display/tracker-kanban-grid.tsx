import { Card } from '@/components/ui/card'
import { TrackerGrid, TrackerField } from './types'
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
  grid: TrackerGrid & { fields: TrackerField[] }
  examples: Array<Record<string, any>>
  onUpdate?: (rowIndex: number, columnId: string, value: any) => void
}

function SortableCard({ id, card, cardFields }: { id: string; card: any; cardFields: TrackerField[] }) {
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
      <KanbanCard card={card} cardFields={cardFields} />
    </div>
  )
}

function KanbanCard({ card, cardFields, isOverlay = false }: { card: any; cardFields: TrackerField[]; isOverlay?: boolean }) {
  return (
    <Card
      className={`p-4 bg-card border-border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${isOverlay ? 'shadow-xl' : ''}`}
    >
      {cardFields.map((field) => (
        <div key={field.fieldName} className="mb-2 last:mb-0">
          <p className="text-xs text-muted-foreground font-medium">
            {field.name}
          </p>
          <div className="text-sm text-foreground">
            <TrackerCell value={card[field.fieldName]} type={field.type} />
          </div>
        </div>
      ))}
    </Card>
  )
}

function DroppableEmptyColumn({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  
  return (
    <div 
      ref={setNodeRef}
      className={`h-24 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center ${
        isOver ? 'border-primary bg-primary/5' : 'border-muted bg-muted/20'
      }`}
    >
      <p className="text-xs text-muted-foreground text-center px-4">
        Drop here
      </p>
    </div>
  )
}

export function TrackerKanbanGrid({ grid, examples, onUpdate }: TrackerKanbanGridProps) {
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

  if (examples.length === 0) return null

  const optionsField = grid.fields.find((f) => f.type === 'options')

  if (!optionsField) {
    return (
      <div className="text-muted-foreground text-sm">
        Kanban view requires an options field to group by
      </div>
    )
  }

  const groups = optionsField.options || []
  const cardFields = grid.fields.filter(
    (f) => f.fieldName !== optionsField.fieldName
  )

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
    const currentCard = examples[cardIdx]

    // overId can be a group name (if dropping into an empty column) or another card's ID
    let nextGroup = overId
    if (overId.includes('-')) {
      const parts = overId.split('-')
      // If it's a card ID, the group name is the last part
      nextGroup = parts[parts.length - 1]
    }

    if (currentCard[optionsField.fieldName] !== nextGroup && onUpdate) {
      onUpdate(cardIdx, optionsField.fieldName, nextGroup)
    }
  }

  const activeCard = activeId ? examples[parseInt(activeId.split('-')[0])] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {groups.map((group) => {
          const cardsInGroup = examples
            .map((ex, idx) => ({ ...ex, _originalIdx: idx } as Record<string, any> & { _originalIdx: number }))
            .filter((ex) => ex[optionsField.fieldName] === group)

          return (
            <div key={group} className="shrink-0 w-80">
              <div className="bg-muted/70 rounded-md p-4 mb-4">
                <h3 className="font-semibold text-foreground flex items-center justify-between">
                  {group}
                  <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                    {cardsInGroup.length}
                  </span>
                </h3>
              </div>
              
              <SortableContext
                id={group}
                items={cardsInGroup.map(c => `${c._originalIdx}-${group}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 min-h-[100px]">
                  {cardsInGroup.length === 0 ? (
                     <DroppableEmptyColumn id={group} />
                  ) : (
                    cardsInGroup.map((card) => (
                      <SortableCard
                        key={`${card._originalIdx}-${group}`}
                        id={`${card._originalIdx}-${group}`}
                        card={card}
                        cardFields={cardFields}
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
          <KanbanCard card={activeCard} cardFields={cardFields} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
