'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TrackerCell } from '../../TrackerCell'
import { resolveDependsOnOverrides } from '@/lib/depends-on'
import type { TrackerFieldType, TrackerOption } from '../../types'
import type { FieldMetadata } from '../data-table/utils'

function toTrackerOptions(
  raw: (string | { id: string; label: string })[] | undefined
): TrackerOption[] | undefined {
  if (!raw?.length) return undefined
  return raw.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : { label: o.label, value: o.id, id: o.id }
  )
}

export interface KanbanCardStyles {
  cardPadding?: string
  labelFontSize?: string
  valueFontSize?: string
  fontWeight?: string
  valueTextColor?: string
}

export interface KanbanCardProps {
  card: Record<string, unknown> & { _originalIdx?: number }
  cardFields: Array<{ id: string; dataType: TrackerFieldType; label: string }>
  gridId: string
  gridData: Record<string, Array<Record<string, unknown>>>
  dependsOn?: import('../../types').DependsOnRules
  fieldMetadata?: FieldMetadata
  isOverlay?: boolean
  onEditRow?: (rowIndex: number) => void
  onDeleteRow?: () => void
  styles?: KanbanCardStyles
}

export function KanbanCard({
  card,
  cardFields,
  gridId,
  gridData,
  dependsOn,
  fieldMetadata,
  isOverlay = false,
  onEditRow,
  onDeleteRow,
  styles = {},
}: KanbanCardProps) {
  const rowIndex = card._originalIdx
  const showEditButton = !isOverlay && onEditRow != null && typeof rowIndex === 'number'
  const showDeleteButton = !isOverlay && onDeleteRow != null
  const overrides =
    typeof rowIndex === 'number'
      ? resolveDependsOnOverrides(dependsOn ?? [], gridData, gridId, rowIndex, card)
      : {}

  const {
    cardPadding = 'p-4',
    labelFontSize = 'text-xs',
    valueFontSize = 'text-sm',
    fontWeight = '',
    valueTextColor = 'text-foreground',
  } = styles

  return (
    <Card
      className={`${cardPadding} bg-card border-border transition-shadow cursor-grab active:cursor-grabbing relative ${fontWeight}`}
    >
      <div className="absolute top-2 right-2 flex gap-0.5">
        {showEditButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onEditRow?.(rowIndex!)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Edit entry"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
        {showDeleteButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDeleteRow?.()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Delete entry"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {cardFields.map((field) => {
        if (overrides[field.id]?.isHidden) return null
        const options = toTrackerOptions(fieldMetadata?.[field.id]?.options)
        return (
          <div key={field.id} className="mb-2 last:mb-0">
            <p className={`${labelFontSize} text-muted-foreground font-medium`}>{field.label}</p>
            <div className={`${valueFontSize} ${valueTextColor}`}>
              <TrackerCell value={card[field.id]} type={field.dataType} options={options} />
            </div>
          </div>
        )
      })}
    </Card>
  )
}

export interface SortableKanbanCardProps extends KanbanCardProps {
  id: string
}

export function SortableKanbanCard({ id, styles = {}, ...cardProps }: SortableKanbanCardProps) {
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
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard {...cardProps} styles={styles} />
    </div>
  )
}
