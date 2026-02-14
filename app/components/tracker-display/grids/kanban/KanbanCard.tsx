'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TrackerCell } from '../../TrackerCell'
import { resolveFieldOptionsV2 } from '@/lib/binding'
import { resolveDependsOnOverrides } from '@/lib/depends-on'
import type { TrackerFieldType, TrackerField, TrackerBindings } from '../../types'
import type { TrackerContextForOptions } from '@/lib/binding'

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
  tabId: string
  gridId: string
  bindings: TrackerBindings
  gridData: Record<string, Array<Record<string, unknown>>>
  fields: TrackerField[]
  dependsOn?: import('../../types').DependsOnRules
  trackerContext?: TrackerContextForOptions
  isOverlay?: boolean
  onEditRow?: (rowIndex: number) => void
  styles?: KanbanCardStyles
}

export function KanbanCard({
  card,
  cardFields,
  tabId,
  gridId,
  bindings,
  gridData,
  fields,
  dependsOn,
  trackerContext,
  isOverlay = false,
  onEditRow,
  styles = {},
}: KanbanCardProps) {
  const rowIndex = card._originalIdx
  const showEditButton = !isOverlay && onEditRow != null && typeof rowIndex === 'number'
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
      {showEditButton && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onEditRow?.(rowIndex!)
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ChevronDown className="h-4 w-4" />
          <span className="sr-only">Edit entry</span>
        </Button>
      )}
      {cardFields.map((field) => {
        if (overrides[field.id]?.isHidden) return null
        const fullField = fields.find((f) => f.id === field.id)
        const options = fullField
          ? resolveFieldOptionsV2(tabId, gridId, fullField, bindings, gridData, trackerContext)
          : undefined
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
