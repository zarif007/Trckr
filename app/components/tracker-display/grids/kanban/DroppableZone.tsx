'use client'

import { useDroppable } from '@dnd-kit/core'

export interface DroppableEmptyColumnProps {
  id: string
}

export function DroppableEmptyColumn({ id }: DroppableEmptyColumnProps) {
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

export interface ColumnDropZoneProps {
  id: string
}

export function ColumnDropZone({ id }: ColumnDropZoneProps) {
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
