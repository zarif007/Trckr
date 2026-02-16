'use client'

import { Table2, LayoutGrid, FormInput } from 'lucide-react'
import type { TrackerGrid } from '../types'
import { InlineEditableName } from '../layout'

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
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
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
  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <GridTypeBadge grid={grid} />
      {editable && onNameChange ? (
        <InlineEditableName value={name} onChange={onNameChange} />
      ) : (
        <span className="text-base font-semibold text-foreground truncate leading-7">
          {name}
        </span>
      )}
    </div>
  )
}
