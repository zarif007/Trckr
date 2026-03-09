'use client'

import { useMemo, useState } from 'react'
import { GitMerge, Plus, Minus, Edit2, Info, Columns2, Rows3 } from 'lucide-react'
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
  changedFields: Set<string>
}

interface GridDiff {
  gridId: string
  rows: DiffRow[]
  allFields: string[]
  hasChanges: boolean
  stats: { added: number; removed: number; modified: number }
}

const ROW_ID_CANDIDATES = ['id', '_id', 'rowId', 'key'] as const

function findRowIdField(rows: Array<Record<string, unknown>>): string | null {
  for (const candidate of ROW_ID_CANDIDATES) {
    if (rows.length > 0 && rows.every((r) => r[candidate] !== undefined && r[candidate] !== null)) {
      return candidate
    }
  }
  return null
}

/**
 * Compute a row-level diff between two GridDataSnapshots.
 * Uses row ID fields (id, _id, rowId, key) for matching when available,
 * falls back to index-based matching.
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

    const fieldSet = new Set<string>()
    for (const row of [...mainRows, ...branchRows]) {
      for (const key of Object.keys(row)) fieldSet.add(key)
    }
    const allFields = Array.from(fieldSet)

    const idField = findRowIdField([...mainRows, ...branchRows])
    const rows: DiffRow[] = []
    let added = 0, removed = 0, modified = 0

    if (idField) {
      const mainMap = new Map<unknown, Record<string, unknown>>()
      for (const row of mainRows) mainMap.set(row[idField], row)

      const branchMap = new Map<unknown, Record<string, unknown>>()
      for (const row of branchRows) branchMap.set(row[idField], row)

      const allIds = new Set([...mainMap.keys(), ...branchMap.keys()])

      for (const rowId of allIds) {
        const mainRow = mainMap.get(rowId) ?? null
        const branchRow = branchMap.get(rowId) ?? null

        if (!mainRow && branchRow) {
          rows.push({ status: 'added', mainRow: null, branchRow, changedFields: new Set(Object.keys(branchRow)) })
          added++
        } else if (mainRow && !branchRow) {
          rows.push({ status: 'removed', mainRow, branchRow: null, changedFields: new Set(Object.keys(mainRow)) })
          removed++
        } else if (mainRow && branchRow) {
          const changedFields = new Set<string>()
          for (const field of allFields) {
            if (JSON.stringify(mainRow[field]) !== JSON.stringify(branchRow[field])) {
              changedFields.add(field)
            }
          }
          if (changedFields.size > 0) {
            rows.push({ status: 'modified', mainRow, branchRow, changedFields })
            modified++
          } else {
            rows.push({ status: 'unchanged', mainRow, branchRow, changedFields: new Set() })
          }
        }
      }
    } else {
      const maxLen = Math.max(mainRows.length, branchRows.length)
      for (let i = 0; i < maxLen; i++) {
        const mainRow = mainRows[i] ?? null
        const branchRow = branchRows[i] ?? null

        if (!mainRow && branchRow) {
          rows.push({ status: 'added', mainRow: null, branchRow, changedFields: new Set(Object.keys(branchRow)) })
          added++
        } else if (mainRow && !branchRow) {
          rows.push({ status: 'removed', mainRow, branchRow: null, changedFields: new Set(Object.keys(mainRow)) })
          removed++
        } else if (mainRow && branchRow) {
          const changedFields = new Set<string>()
          for (const field of allFields) {
            if (JSON.stringify(mainRow[field]) !== JSON.stringify(branchRow[field])) {
              changedFields.add(field)
            }
          }
          if (changedFields.size > 0) {
            rows.push({ status: 'modified', mainRow, branchRow, changedFields })
            modified++
          } else {
            rows.push({ status: 'unchanged', mainRow, branchRow, changedFields: new Set() })
          }
        }
      }
    }

    diffs.push({ gridId, rows, allFields, hasChanges: added + removed + modified > 0, stats: { added, removed, modified } })
  }

  return diffs
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function SideBySideDiffRow({
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
          <td key={f} className="px-3 py-1.5 text-[11px] text-muted-foreground/30 italic border-r border-border/30 last:border-r-0">—</td>
        ))}
      </tr>
    )
  }
  if (!data && row.status === 'removed' && side === 'branch') {
    return (
      <tr className="bg-red-500/5">
        {fields.map((f) => (
          <td key={f} className="px-3 py-1.5 text-[11px] text-muted-foreground/30 italic border-r border-border/30 last:border-r-0">—</td>
        ))}
      </tr>
    )
  }
  if (!data) return null

  const bgClass =
    row.status === 'added' ? 'bg-emerald-500/10'
    : row.status === 'removed' ? 'bg-red-500/10'
    : row.status === 'modified' ? 'bg-amber-500/5'
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
            <span className="truncate block">{formatValue(data[f])}</span>
          </td>
        )
      })}
    </tr>
  )
}

function InlineDiffRow({ row, fields }: { row: DiffRow; fields: string[] }) {
  const data = row.branchRow ?? row.mainRow
  if (!data) return null

  const prefix =
    row.status === 'added' ? '+' : row.status === 'removed' ? '-' : row.status === 'modified' ? '~' : ' '
  const bgClass =
    row.status === 'added' ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
    : row.status === 'removed' ? 'bg-red-500/10 border-l-2 border-l-red-500'
    : row.status === 'modified' ? 'bg-amber-500/5 border-l-2 border-l-amber-500'
    : 'border-l-2 border-l-transparent'

  return (
    <tr className={bgClass}>
      <td className="px-2 py-1.5 text-[11px] font-mono text-muted-foreground/50 w-6 text-center border-r border-border/30">
        {prefix}
      </td>
      {fields.map((f) => {
        const isChanged = row.changedFields.has(f)
        return (
          <td
            key={f}
            className={cn(
              'px-3 py-1.5 text-[11px] border-r border-border/30 last:border-r-0 max-w-[160px]',
              isChanged ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            <span className="truncate block">{formatValue(data[f])}</span>
            {isChanged && row.status === 'modified' && row.mainRow && (
              <span className="truncate block text-[10px] text-red-500/70 line-through mt-0.5">
                {formatValue(row.mainRow[f])}
              </span>
            )}
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
  const [mode, setMode] = useState<'side-by-side' | 'inline'>('side-by-side')

  const diffs = useMemo(
    () => computeGridDiff(mainBranch.data, currentBranch.data),
    [mainBranch.data, currentBranch.data],
  )

  const changedGrids = diffs.filter((d) => d.hasChanges)
  const totalAdded = diffs.reduce((a, d) => a + d.stats.added, 0)
  const totalRemoved = diffs.reduce((a, d) => a + d.stats.removed, 0)
  const totalModified = diffs.reduce((a, d) => a + d.stats.modified, 0)
  const totalFieldChanges = diffs.reduce((a, d) => {
    return a + d.rows.reduce((b, r) => b + r.changedFields.size, 0)
  }, 0)
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

        {/* Summary bar with mode toggle */}
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
                  {totalModified} modified ({totalFieldChanges} field{totalFieldChanges !== 1 ? 's' : ''})
                </span>
              )}
              <span className="text-muted-foreground/60 ml-auto mr-2">
                {changedGrids.length} grid{changedGrids.length !== 1 ? 's' : ''} changed
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Info className="h-3 w-3" />
              No differences — branches are identical
            </span>
          )}

          {/* Mode toggle */}
          {hasAnyChanges && (
            <div className="flex items-center rounded-md border border-border/60 bg-background/80 p-0.5 ml-auto">
              <button
                type="button"
                onClick={() => setMode('side-by-side')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1',
                  mode === 'side-by-side' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Columns2 className="h-2.5 w-2.5" /> Split
              </button>
              <button
                type="button"
                onClick={() => setMode('inline')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1',
                  mode === 'inline' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Rows3 className="h-2.5 w-2.5" /> Unified
              </button>
            </div>
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
                <span className="font-normal normal-case tracking-normal">
                  ({diff.stats.added + diff.stats.removed + diff.stats.modified} change{diff.stats.added + diff.stats.removed + diff.stats.modified !== 1 ? 's' : ''})
                </span>
              </div>

              {mode === 'side-by-side' ? (
                <div className="grid grid-cols-2 divide-x divide-border/50 overflow-hidden">
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
                          <SideBySideDiffRow key={i} row={row} fields={diff.allFields} side="main" />
                        ))}
                      </tbody>
                    </table>
                  </div>

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
                          <SideBySideDiffRow key={i} row={row} fields={diff.allFields} side="branch" />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground w-6 border-r border-border/30" />
                        {diff.allFields.map((f) => (
                          <th key={f} className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/30 last:border-r-0">
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {diff.rows
                        .filter((r) => r.status !== 'unchanged')
                        .map((row, i) => (
                          <InlineDiffRow key={i} row={row} fields={diff.allFields} />
                        ))}
                      {diff.rows.every((r) => r.status === 'unchanged') && (
                        <tr>
                          <td colSpan={diff.allFields.length + 1} className="px-3 py-4 text-center text-xs text-muted-foreground">
                            All rows are identical
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* Unchanged grids summary */}
          {diffs.some((d) => !d.hasChanges) && hasAnyChanges && (
            <div className="px-3 py-2 text-[11px] text-muted-foreground/50 border-t border-border/30">
              {diffs.filter((d) => !d.hasChanges).length} unchanged grid{diffs.filter((d) => !d.hasChanges).length !== 1 ? 's' : ''} not shown
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
