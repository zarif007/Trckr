'use client'

import { Table2, LayoutGrid, FormInput } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrackerGrid } from '../types'
import { InlineEditableName, useBlockControls, LabelWithBlockControls } from '../layout'
import { theme } from '@/lib/theme'

/** Grid type badge: small pill showing Table/Kanban/Form. Exported for use in BlockEditor or elsewhere. */
export function GridTypeBadge({ grid }: { grid: TrackerGrid }) {
 const type = grid.views?.[0]?.type ?? grid.type ?? 'table'
 const map: Record<string, { icon: typeof Table2; label: string }> = {
 table: { icon: Table2, label: 'Table' },
 kanban: { icon: LayoutGrid, label: 'Kanban' },
 div: { icon: FormInput, label: 'Form' },
 }
 const info = map[type] ?? map.table
 const Icon = info.icon

 const colorClasses = {
 table: 'bg-info/10 text-info border border-info/20',
 kanban: 'bg-warning/10 text-warning border border-warning/20',
 div: 'bg-success/10 text-success border border-success/20',
 }
 const badgeClass = colorClasses[type as keyof typeof colorClasses] || 'bg-muted/50 text-muted-foreground border border-muted/50'

 return (
 <span className={cn('inline-flex items-center gap-1 text-[11px] rounded-sm px-1.5 py-0.5 font-medium', badgeClass)}>
 <Icon className="h-3 w-3" />
 {info.label}
 </span>
 )
}

export interface GridBlockHeaderProps {
 grid: TrackerGrid
 name: string
 editable?: boolean
 onNameChange?: (name: string) => void
}

/**
 * Shared grid block header: badge + name (editable or read-only).
 * Same look in edit and view mode. Parent should wrap with space-y-2.5 when followed by GridBlockContent.
 */
export function GridBlockHeader({
 grid,
 name,
 editable = false,
 onNameChange,
}: GridBlockHeaderProps) {
 const controls = useBlockControls()

 const nameContent = editable && onNameChange ? (
 <InlineEditableName value={name} onChange={onNameChange} />
 ) : (
 <span className="text-base font-semibold text-foreground truncate leading-7">
 {name}
 </span>
 )

 const badgeAndName = (
 <div className="flex items-center gap-1.5 min-w-0">
 <GridTypeBadge grid={grid} />
 {nameContent}
 </div>
 )

 return (
 <div className="flex items-center w-full min-w-0">
 {controls ? (
 <LabelWithBlockControls
 label={badgeAndName}
 onRemove={controls.onRemove}
 dragHandleProps={controls.dragHandleProps}
 onAddBlockClick={controls.onAddBlockClick}
 isSortable={controls.isSortable}
 />
 ) : (
 badgeAndName
 )}
 </div>
 )
}
