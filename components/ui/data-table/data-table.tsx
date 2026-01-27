'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  RowSelectionState,
  VisibilityState,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { FieldMetadata, getFieldIcon } from './utils'
import { DataTableCell } from './data-table-cell'
import { DataTableInput } from './data-table-input'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  fieldMetadata?: FieldMetadata
  onCellUpdate?: (rowIndex: number, columnId: string, value: any) => void
  config?: any
}

export function DataTable<TData, TValue>({
  columns,
  data,
  fieldMetadata,
  onCellUpdate,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  // Initialize column visibility: first 5 columns visible, others hidden
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const initialVisibility: VisibilityState = {}
    columns.forEach((col, index) => {
      // @ts-ignore - accessorKey might not exist on all column types but usually does for data columns
      const key = col.id || col.accessorKey || index.toString()
      if (key) {
        initialVisibility[key] = index < 5
      }
    })
    return initialVisibility
  })

  // Memoize columns to prevent unnecessary re-renders that might close the dialog
  const columnsWithSelectionAndActions = useMemo<ColumnDef<TData, TValue>[]>(() => [
    {
      id: 'select',
      size: 34,
      minSize: 34,
      maxSize: 34,
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        </div>
      ),
    } as ColumnDef<TData, TValue>,
    ...columns,
    {
      id: 'actions',
      size: 34,
      minSize: 34,
      maxSize: 34,
      header: ({ table }) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-muted">
              <Settings2 className="h-4 w-4" />
              <span className="sr-only">View settings</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[300px]" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Toggle Columns</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-2">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== 'undefined' &&
                      column.getCanHide()
                  )
                  .map((column) => {
                    return (
                      <div
                        key={column.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                          id={`col-${column.id}`}
                        />
                        <label
                          htmlFor={`col-${column.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full py-1"
                        >
                          {typeof column.columnDef.header === 'string'
                            ? column.columnDef.header
                            : column.id}
                        </label>
                      </div>
                    )
                  })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ),
      cell: ({ row, table }) => {
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only">View full details</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Row Details</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-4 max-h-[70vh] overflow-y-auto">
                {table
                  .getAllColumns()
                  .filter(
                    (col) =>
                      col.id !== 'select' &&
                      col.id !== 'actions'
                  )
                  .map((col) => {
                    const cell = row.getAllCells().find(c => c.column.id === col.id)
                    const meta = table.options.meta as any
                    const fieldMetadata = meta?.fieldMetadata
                    const fieldInfo = fieldMetadata?.[col.id]
                    const value = cell ? cell.getValue() : row.getValue(col.id)

                    return (
                      <div key={col.id} className="flex flex-col space-y-1.5 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {typeof col.columnDef.header === 'string'
                            ? col.columnDef.header
                            : col.id}
                        </span>
                        <div className="text-sm">
                          {fieldInfo ? (
                            <div className="rounded-md border border-border/40 bg-muted/5 focus-within:bg-background focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                              <DataTableInput
                                value={value}
                                onChange={(newValue) => {
                                  const updateData = meta?.updateData
                                  updateData?.(row.index, col.id, newValue)
                                }}
                                type={fieldInfo.type}
                                options={fieldInfo.options}
                                className="h-10 px-3 bg-transparent border-0 focus-visible:ring-0"
                              />
                            </div>
                          ) : cell ? (
                            <div className="rounded-md border border-border/40 px-3 py-2 bg-muted/20">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          ) : (
                            <div className="rounded-md border border-border/40 px-3 py-2 bg-muted/20">
                              {String(value)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </DialogContent>
          </Dialog>
        )
      },
    } as ColumnDef<TData, TValue>,
  ], [columns])

  const table = useReactTable({
    data: data,
    columns: columnsWithSelectionAndActions,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    meta: {
      updateData: onCellUpdate,
      fieldMetadata: fieldMetadata,
    },
  })

  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border-[1.5px] border-border/60 bg-card/50 overflow-x-auto">
        <Table className="w-full min-w-full border-collapse table-fixed">
          <TableHeader className="">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent border-b border-border/40"
              >
                {headerGroup.headers.map((header) => {
                  const isSelect = header.id === 'select'
                  const isActions = header.id === 'actions'
                  const fieldType = fieldMetadata?.[header.id]?.type
                  const Icon = fieldType ? getFieldIcon(fieldType) : null

                  const fixedWidth = '34px'

                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: isSelect || isActions ? fixedWidth : '150px',
                        minWidth: isSelect || isActions ? fixedWidth : '150px',
                      }}
                      className={cn(
                        'h-9 text-muted-foreground font-medium text-[13px] border-r border-border/50 last:border-r-0',
                        (isSelect || isActions) ? 'p-0 text-center w-[34px]' : 'px-4'
                      )}
                    >
                      {header.isPlaceholder ? null : isSelect || isActions ? (
                        <div className="flex items-center justify-center w-full h-full">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 overflow-hidden">
                          {Icon && (
                            <Icon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          )}
                          <span className="truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="group border-b border-border/50 last:border-0 transition-colors duration-200 ease-in-out hover:bg-transparent dark:hover:bg-transparent"
                >
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === 'actions') {
                       return (
                         <TableCell key={cell.id} className="p-0 text-center align-middle h-full border-r border-border/50 last:border-r-0 max-w-[34px]">
                            <div className="flex items-center justify-center w-full h-full min-h-[inherit]">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </div>
                         </TableCell>
                       )
                    }
                    return (
                      <DataTableCell
                        key={cell.id}
                        cell={cell}
                        row={row}
                        fieldMetadata={fieldMetadata}
                      />
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnsWithSelectionAndActions.length}
                  className="h-24 text-center text-muted-foreground text-sm"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
