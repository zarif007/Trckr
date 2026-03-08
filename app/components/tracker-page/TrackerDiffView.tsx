'use client'

import { useMemo } from 'react'
import { GitMerge, Plus, Minus, Edit2, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type GridDataSnapshot = Record<string, Array<Record<string, unknown>>>

export interface BranchInfo {
  id: string
  branchName: string
  label?: string | null
  author?: { name?: string | null; email?: string | null } | null
  createdAt?: string
  updatedAt?: string
  data: GridDataSnapshot
}

type RowStatus = 'added' | 'removed' | 'modified' | 'unchanged'

interface DiffRow {
  status: RowStatus
  mainRow: Record<string, unknown> | null
  branchRow: Record<string, unknown> | null
  /** field-level diffs: fieldId -> true if changed */
  changedFields: Set<string>
}

interface GridDiff {
  gridId: string
  rows: DiffRow[]
  allFields: string[]
  hasChanges: boolean
}

/**
 * Compute a row-level diff between two GridDataSnapshots.
 * Uses JSON stringify to identify equal rows. Rows are matched by position (index).
 */
export function computeGridDiff(
  mainData: GridDataSnapshot,
  branchData: GridDataSnapshot,
): GridDiff[] {
  const allGridIds = new Set([...Object.keys(mainData), ...Object.keys(branchData)])
  const diffs: GridDiff[] = []

  for (const gridId of allGridIds) {
    const mainRows = mainData[gridId] ?? []
    const branchRows = branchData[gridId] ?? []
    const maxLen = Math.max(mainRows.length, branchRows.length)

    // Collect all field names
    const fieldSet = new Set<string>()
    for (const row of [...mainRows, ...branchRows]) {
      for (const key of Object.keys(row)) fieldSet.add(key)
    }
    const allFields = Array.from(fieldSet)

    const rows: DiffRow[] = []
    let hasChanges = false

    for (let i = 0; i < maxLen; i++) {
      const mainRow = mainRows[i] ?? null
      const branchRow = branchRows[i] ?? null

      if (mainRow === null && branchRow !== null) {
        rows.push({ status: 'added', mainRow: null, branchRow, changedFields: new Set(Object.keys(branchRow)) })
        hasChanges = true
      } else if (mainRow !== null && branchRow === null) {
        rows.push({ status: 'removed', mainRow, branchRow: null, changedFields: new Set(Object.keys(mainRow)) })
        hasChanges = true
      } else if (mainRow !== null && branchRow !== null) {
        const changedFields = new Set<string>()
        for (const field of allFields) {
          if (JSON.stringify(mainRow[field]) !== JSON.stringify(branchRow[field])) {
            changedFields.add(field)
          }
        }
        if (changedFields.size > 0) {
          rows.push({ status: 'modified', mainRow, branchRow, changedFields })
          hasChanges = true
        } else {
          rows.push({ status: 'unchanged', mainRow, branchRow, changedFields: new Set() })
        }
      }
    }

    diffs.push({ gridId, rows, allFields, hasChanges })
  }

  return diffs
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function DiffRowDisplay({
  row,
  fields,
  side,
}: {
  row: DiffRow
  fields: string[]
  side: 'main' | 'branch'
}) {
  const data = side === 'main' ? row.mainRow : row.branchRow
  if (!data && row.status === 'added' && side === 'main') {
    return (
      <tr className="bg-emerald-500/5">
        {fields.map((f) => (
          <td key={f} className="px-3 py-1.5 text-[11px] text-muted-foreground/30 italic border-r border-border/30 last:border-r-0">
            —
          </td>
        ))}
      </tr>
    )
  }
  if (!data && row.status === 'removed' && side === 'branch') {
    return (
      <tr className="bg-red-500/5">
        {fields.map((f) => (
          <td key={f} className="px-3 py-1.5 text-[11px] text-muted-foreground/30 italic border-r border-border/30 last:border-r-0">
            —
          </td>
        ))}
      </tr>
    )
  }
  if (!data) return null

  const bgClass =
    row.status === 'added'
      ? 'bg-emerald-500/10'
      : row.status === 'removed'
        ? 'bg-red-500/10'
        : row.status === 'modified'
          ? 'bg-amber-500/5'
          : ''

  return (
    <tr className={bgClass}>
      {fields.map((f) => {
        const isChanged = row.changedFields.has(f)
        return (
          <td
            key={f}
            className={cn(
              'px-3 py-1.5 text-[11px] border-r border-border/30 last:border-r-0 max-w-[160px]',
              isChanged && row.status === 'modified'
                ? side === 'main'
                  ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'text-foreground',
            )}
          >
            <span className="truncate block">
              {formatValue(data[f])}
            </span>
          </td>
        )
      })}
    </tr>
  )
}

interface TrackerDiffViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mainBranch: BranchInfo
  currentBranch: BranchInfo
}

export function TrackerDiffView({
  open,
  onOpenChange,
  mainBranch,
  currentBranch,
}: TrackerDiffViewProps) {
  const diffs = useMemo(
    () => computeGridDiff(mainBranch.data, currentBranch.data),
    [mainBranch.data, currentBranch.data],
  )

  const changedGrids = diffs.filter((d) => d.hasChanges)
  const totalAdded = diffs.reduce((a, d) => a + d.rows.filter((r) => r.status === 'added').length, 0)
  const totalRemoved = diffs.reduce((a, d) => a + d.rows.filter((r) => r.status === 'removed').length, 0)
  const totalModified = diffs.reduce((a, d) => a + d.rows.filter((r) => r.status === 'modified').length, 0)
  const hasAnyChanges = changedGrids.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-primary" />
            Diff: <span className="font-mono text-muted-foreground">{mainBranch.branchName}</span>
            <span className="text-muted-foreground/50 mx-1">←</span>
            <span className="font-mono text-primary">{currentBranch.branchName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Summary bar */}
        <div className="flex-shrink-0 flex items-center gap-4 px-1 py-2 border-b border-border/50 text-[11px]">
          {hasAnyChanges ? (
            <>
              {totalAdded > 0 && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Plus className="h-3 w-3" />
                  {totalAdded} added
                </span>
              )}
              {totalRemoved > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <Minus className="h-3 w-3" />
                  {totalRemoved} removed
                </span>
              )}
              {totalModified > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Edit2 className="h-3 w-3" />
                  {totalModified} modified
                </span>
              )}
              <span className="text-muted-foreground/60 ml-auto">
                {changedGrids.length} grid{changedGrids.length !== 1 ? 's' : ''} changed
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Info className="h-3 w-3" />
              No differences — branches are identical
            </span>
          )}
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-auto min-h-0">
          {!hasAnyChanges && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <GitMerge className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No differences found</p>
              <p className="text-xs opacity-60">
                <span className="font-mono">{currentBranch.branchName}</span> is identical to <span className="font-mono">{mainBranch.branchName}</span>
              </p>
            </div>
          )}

          {changedGrids.map((diff) => (
            <div key={diff.gridId} className="mb-6">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Grid: {diff.gridId}</span>
                <span className="font-normal normal-case">
                  ({diff.rows.filter((r) => r.status !== 'unchanged').length} change{diff.rows.filter((r) => r.status !== 'unchanged').length !== 1 ? 's' : ''})
                </span>
              </div>

              {/* Side-by-side table */}
              <div className="grid grid-cols-2 divide-x divide-border/50 overflow-hidden">
                {/* Left: main */}
                <div className="overflow-x-auto">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 border-b border-border/30 bg-muted/10">
                    {mainBranch.branchName} (base)
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border/30">
                        {diff.allFields.map((f) => (
                          <th key={f} className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/30 last:border-r-0">
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {diff.rows.map((row, i) => (
                        <DiffRowDisplay key={i} row={row} fields={diff.allFields} side="main" />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right: branch */}
                <div className="overflow-x-auto">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/70 border-b border-border/30 bg-primary/5">
                    {currentBranch.branchName} (branch)
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border/30">
                        {diff.allFields.map((f) => (
                          <th key={f} className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/30 last:border-r-0">
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {diff.rows.map((row, i) => (
                        <DiffRowDisplay key={i} row={row} fields={diff.allFields} side="branch" />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
