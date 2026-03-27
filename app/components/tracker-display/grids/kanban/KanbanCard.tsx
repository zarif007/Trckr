'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Settings2, ChevronDown, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TrackerCell } from '../../TrackerCell'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { resolveFieldRuleOverrides } from '@/lib/field-rules'
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
  fieldRules?: import('../../types').FieldRules
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
  fieldRules,
  fieldMetadata,
  isOverlay = false,
  onEditRow,
  onDeleteRow,
  styles = {},
}: KanbanCardProps) {
  const rowIndex = card._originalIdx
  const showEditButton = !isOverlay && onEditRow != null && typeof rowIndex === 'number'
  const showSettingsButton = !isOverlay && onDeleteRow != null
  const overrides =
    typeof rowIndex === 'number'
      ? resolveFieldRuleOverrides(fieldRules ?? [], gridData, gridId, rowIndex, card)
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
      className={cn(
        'group relative cursor-grab overflow-hidden border bg-card shadow-sm transition-all hover:shadow-md active:cursor-grabbing',
        cardPadding,
        fontWeight,
        theme.radius.md,
        theme.border.subtle
      )}
    >
      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5">
        {showEditButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEditRow?.(rowIndex!)
            }}
            aria-label="Edit entry"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
        {showSettingsButton && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                aria-label="More actions"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              className="w-44 p-1 rounded-md border-border/50 shadow-lg"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-0.5">
                {onDeleteRow != null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 justify-start gap-2 rounded-md px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-normal"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteRow()
                    }}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    Delete
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className={cn('min-w-0', (showEditButton || showSettingsButton) && 'pr-16')}>
        {cardFields.map((field) => {
          if (overrides[field.id]?.isHidden) return null
          const options = toTrackerOptions(fieldMetadata?.[field.id]?.options)
          return (
            <div key={field.id} className="mb-2.5 last:mb-0">
              <p className={`${labelFontSize} text-muted-foreground font-medium mb-0.5`}>{field.label}</p>
              <div className={`${valueFontSize} ${valueTextColor} break-words`}>
                <TrackerCell value={card[field.id]} type={field.dataType} options={options} config={fieldMetadata?.[field.id]?.config} />
              </div>
            </div>
          )
        })}
      </div>
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
