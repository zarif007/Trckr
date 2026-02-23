'use client'

import { useMemo } from 'react'
import { parsePath } from '@/lib/resolve-bindings'
import type { DependsOnRules } from '@/lib/depends-on'
import type { TrackerGrid, TrackerField } from './types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { resolveTableStyles } from '@/lib/style-utils'
import { cn } from '@/lib/utils'

const SHARED_TAB_ID = 'shared_tab'

function resolvePathLabel(
  path: string,
  grids: TrackerGrid[],
  fields: TrackerField[]
): string {
  const { gridId, fieldId } = parsePath(path)
  if (!gridId && !fieldId) return path
  const grid = grids.find((g) => g.id === gridId)
  const field = fields.find((f) => f.id === fieldId)
  const gridName = grid?.name ?? gridId ?? ''
  const fieldLabel = field?.ui?.label ?? fieldId ?? ''
  if (gridName && fieldLabel) return `${gridName} → ${fieldLabel}`
  return fieldLabel || gridName || path
}

function formatRuleValue(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.map(String).join(', ')
  return String(value)
}

export interface DependsOnTableProps {
  rules: DependsOnRules
  grids: TrackerGrid[]
  fields: TrackerField[]
  /** Optional style overrides to match grid tables (e.g. from tracker styles). */
  styleOverrides?: import('./types').StyleOverrides
  /** When true and rules are empty, render the table wrapper with a "No rules" message instead of null. */
  showEmptyState?: boolean
}

export function DependsOnTable({
  rules,
  grids,
  fields,
  styleOverrides,
  showEmptyState = false,
}: DependsOnTableProps) {
  const ts = useMemo(() => resolveTableStyles(styleOverrides), [styleOverrides])

  if (!rules?.length) {
    if (showEmptyState) {
      return (
        <div
          className={cn(
            'rounded-md overflow-x-auto',
            ts.borderStyle,
            ts.accentBorder,
            ts.tableBg || 'bg-card/50',
            'px-4 py-6 text-center text-sm text-muted-foreground'
          )}
        >
          No rules.
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={cn(
        'rounded-md overflow-x-auto',
        ts.borderStyle,
        ts.accentBorder,
        ts.tableBg || 'bg-card/50'
      )}
    >
      <Table
        className={cn(
          'w-full min-w-max border-collapse',
          ts.fontSize,
          ts.fontWeight,
          ts.textColor,
          ts.tableBg && 'bg-transparent'
        )}
      >
        <TableHeader className={ts.headerBg}>
          <TableRow className="hover:bg-transparent border-b border-border/40">
            <TableHead
              className={cn(
                ts.headerHeight,
                'text-muted-foreground font-medium border-r border-border/50 last:border-r-0',
                ts.headerFontSize,
                ts.cellPadding
              )}
            >
              Source
            </TableHead>
            <TableHead
              className={cn(
                ts.headerHeight,
                'text-muted-foreground font-medium border-r border-border/50 last:border-r-0',
                ts.headerFontSize,
                ts.cellPadding
              )}
            >
              Operator
            </TableHead>
            <TableHead
              className={cn(
                ts.headerHeight,
                'text-muted-foreground font-medium border-r border-border/50 last:border-r-0',
                ts.headerFontSize,
                ts.cellPadding
              )}
            >
              Value
            </TableHead>
            <TableHead
              className={cn(
                ts.headerHeight,
                'text-muted-foreground font-medium border-r border-border/50 last:border-r-0',
                ts.headerFontSize,
                ts.cellPadding
              )}
            >
              Action
            </TableHead>
            <TableHead
              className={cn(
                ts.headerHeight,
                'text-muted-foreground font-medium border-r border-border/50 last:border-r-0',
                ts.headerFontSize,
                ts.cellPadding
              )}
            >
              Set
            </TableHead>
            <TableHead
              className={cn(
                ts.headerHeight,
                'text-muted-foreground font-medium last:border-r-0',
                ts.headerFontSize,
                ts.cellPadding
              )}
            >
              Targets
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={ts.tableBg ? 'bg-transparent' : undefined}>
          {rules.map((rule, idx) => {
            const sourceLabel = resolvePathLabel(rule.source, grids, fields)
            const targetsLabel =
              rule.targets?.map((t) => resolvePathLabel(t, grids, fields)).join(', ') ?? '—'
            return (
              <TableRow
                key={idx}
                className={cn(
                  'group border-b border-border/50 last:border-0 transition-colors duration-200 ease-in-out hover:bg-transparent dark:hover:bg-transparent',
                  ts.tableBg && '!bg-transparent',
                  ts.stripedRows && idx % 2 === 1 && 'bg-muted/30'
                )}
              >
                <TableCell
                  className={cn(
                    'border-r border-border/50 last:border-r-0 text-muted-foreground',
                    ts.cellPadding
                  )}
                >
                  {sourceLabel}
                </TableCell>
                <TableCell
                  className={cn('border-r border-border/50 last:border-r-0', ts.cellPadding)}
                >
                  {rule.operator ?? 'eq'}
                </TableCell>
                <TableCell
                  className={cn(
                    'border-r border-border/50 last:border-r-0 text-muted-foreground',
                    ts.cellPadding
                  )}
                >
                  {formatRuleValue(rule.value)}
                </TableCell>
                <TableCell
                  className={cn('border-r border-border/50 last:border-r-0', ts.cellPadding)}
                >
                  {rule.action ?? '—'}
                </TableCell>
                <TableCell
                  className={cn(
                    'border-r border-border/50 last:border-r-0 text-muted-foreground',
                    ts.cellPadding
                  )}
                >
                  {formatRuleValue(rule.set)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-muted-foreground last:border-r-0',
                    ts.cellPadding
                  )}
                  title={targetsLabel}
                >
                  <span className="block max-w-[240px] truncate">{targetsLabel}</span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export { SHARED_TAB_ID }
