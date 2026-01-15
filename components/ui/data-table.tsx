'use client'

import * as React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  RowSelectionState,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onDataChange?: (data: TData[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onDataChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [editingCell, setEditingCell] = React.useState<{
    rowId: string
    columnId: string
  } | null>(null)
  const [tableData, setTableData] = React.useState<TData[]>(data)

  React.useEffect(() => {
    setTableData(data)
  }, [data])

  const handleCellEdit = (rowIndex: number, columnId: string, value: any) => {
    const newData = [...tableData]
    ;(newData[rowIndex] as any)[columnId] = value
    setTableData(newData)
    onDataChange?.(newData)
  }

  const columnsWithSelection: ColumnDef<TData, TValue>[] = [
    {
      id: 'select',
      size: 44, // Precise fixed width for the checkbox column
      header: ({ table }) => (
        <div className="flex items-center justify-center w-[44px]">
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
        <div className="flex items-center justify-center w-[44px]">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        </div>
      ),
    } as ColumnDef<TData, TValue>,
    ...columns,
  ]

  const table = useReactTable({
    data: tableData,
    columns: columnsWithSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  })

  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border border-border bg-transparent overflow-hidden">
        <Table className="table-fixed w-full border-collapse">
          <TableHeader className="bg-gray-100 dark:bg-black">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent border-b border-border"
              >
                {headerGroup.headers.map((header) => {
                  const isSelect = header.id === 'select'
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: isSelect ? '44px' : 'auto' }}
                      className={cn(
                        'h-11 text-foreground font-bold text-sm border-r border-border/50 last:border-r-0',
                        isSelect ? 'p-0' : 'px-4' // Remove padding for checkbox head
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
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
                  className="group hover:bg-muted/10 border-b border-border/50 last:border-0 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isSelect = cell.column.id === 'select'
                    const isEditing =
                      editingCell?.rowId === row.id &&
                      editingCell?.columnId === cell.column.id

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'relative p-0 h-11 border-r border-border/30 last:border-r-0',
                          isEditing &&
                            'ring-2 ring-primary ring-inset z-20 shadow-lg'
                        )}
                      >
                        {isSelect ? (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
                        ) : (
                          <div className="w-full h-full relative">
                            {isEditing ? (
                              <input
                                autoFocus
                                className="absolute inset-0 w-full h-full px-4 bg-background outline-none text-sm z-30"
                                defaultValue={cell.getValue() as string}
                                onBlur={(e) => {
                                  handleCellEdit(
                                    row.index,
                                    cell.column.id,
                                    e.target.value
                                  )
                                  setEditingCell(null)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur()
                                  if (e.key === 'Escape') setEditingCell(null)
                                }}
                              />
                            ) : (
                              <div
                                className="w-full h-full px-4 flex items-center cursor-text text-sm"
                                onClick={() =>
                                  setEditingCell({
                                    rowId: row.id,
                                    columnId: cell.column.id,
                                  })
                                }
                              >
                                <span className="truncate">
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnsWithSelection.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
        <div>
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} selected
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="disabled:opacity-30 hover:text-foreground transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="disabled:opacity-30 hover:text-foreground transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
