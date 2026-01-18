// components/ui/styled-table.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

const StyledTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
))
StyledTable.displayName = 'StyledTable'

const StyledTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('', className)} {...props} />
))
StyledTableHeader.displayName = 'StyledTableHeader'

const StyledTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
))
StyledTableBody.displayName = 'StyledTableBody'

const StyledTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50',
      className
    )}
    {...props}
  />
))
StyledTableRow.displayName = 'StyledTableRow'

const StyledTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 last:border-r-0',
      className
    )}
    {...props}
  />
))
StyledTableHead.displayName = 'StyledTableHead'

const StyledTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-4 py-4 align-middle text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-800 last:border-r-0',
      className
    )}
    {...props}
  />
))
StyledTableCell.displayName = 'StyledTableCell'

interface StyledTableCheckboxCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const StyledTableCheckboxCell = React.forwardRef<
  HTMLTableCellElement,
  StyledTableCheckboxCellProps
>(({ className, checked, onCheckedChange, children, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-4 py-4 align-middle text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-800',
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-3">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      {children}
    </div>
  </td>
))
StyledTableCheckboxCell.displayName = 'StyledTableCheckboxCell'

interface StyledTableCheckboxHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const StyledTableCheckboxHead = React.forwardRef<
  HTMLTableCellElement,
  StyledTableCheckboxHeadProps
>(({ className, checked, onCheckedChange, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-3">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      {children}
    </div>
  </th>
))
StyledTableCheckboxHead.displayName = 'StyledTableCheckboxHead'

export {
  StyledTable,
  StyledTableHeader,
  StyledTableBody,
  StyledTableRow,
  StyledTableHead,
  StyledTableCell,
  StyledTableCheckboxCell,
  StyledTableCheckboxHead,
}
