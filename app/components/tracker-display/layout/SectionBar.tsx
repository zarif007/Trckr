'use client'

import type { ReactNode } from 'react'
import { LayoutList, ChevronDown, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SECTION_BAR_CLASS } from './layout-tokens'
import { useBlockControls } from './block-controls-context'
import { LabelWithBlockControls } from './LabelWithBlockControls'
import { cn } from '@/lib/utils'

export interface SectionBarProps {
  name: string
  collapsed?: boolean
  onCollapseToggle?: () => void
  children?: ReactNode
  icon?: LucideIcon
  className?: string
}

export function SectionBar({
  name,
  collapsed = false,
  onCollapseToggle,
  children,
  icon: Icon = LayoutList,
  className,
}: SectionBarProps) {
  const isClickable = collapsed && onCollapseToggle
  const controls = useBlockControls()

  const labelContent = children ?? (
    <span className="text-base font-semibold text-foreground truncate leading-7">
      {name}
    </span>
  )

  return (
    <div
      className={cn(SECTION_BAR_CLASS, className)}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onCollapseToggle : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
            if (e.key === 'Enter') onCollapseToggle?.()
          }
          : undefined
      }
      aria-label={isClickable ? 'Expand section' : undefined}
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <span className="flex-1 min-w-0 truncate">
        {controls ? (
          <LabelWithBlockControls
            label={labelContent}
            onRemove={controls.onRemove}
            dragHandleProps={controls.dragHandleProps}
            onAddBlockClick={controls.onAddBlockClick}
            isSortable={controls.isSortable}
          />
        ) : (
          labelContent
        )}
      </span>
      {onCollapseToggle && !collapsed && (
        <button
          type="button"
          className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onCollapseToggle()
          }}
          aria-label="Collapse section"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
      {onCollapseToggle && collapsed && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </div>
  )
}
