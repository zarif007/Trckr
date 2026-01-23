'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { FieldMetadata, getFieldIcon } from './utils'
import { DataTableCell } from './data-table-cell'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  fieldMetadata?: FieldMetadata
  onCellUpdate?: (rowIndex: number, columnId: string, value: any) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  fieldMetadata,
  onCellUpdate,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const tableRef = useRef<HTMLDivElement>(null)

  const columnsWithSelection: ColumnDef<TData, TValue>[] = [
    {
      id: 'select',
      size: 32,
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
  ]

  const table = useReactTable({
    data: data,
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
    meta: {
      updateData: onCellUpdate,
    },
  })

  return (
    <div className="w-full space-y-4" ref={tableRef}>
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
                  const fieldType = fieldMetadata?.[header.id]?.type
                  const Icon = fieldType ? getFieldIcon(fieldType) : null

                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: isSelect ? '32px' : '150px',
                        minWidth: isSelect ? '32px' : '150px',
                      }}
                      className={cn(
                        'h-9 text-muted-foreground font-medium text-[13px] border-r border-border/50 last:border-r-0',
                        isSelect ? 'p-0 w-[32px]' : 'px-4'
                      )}
                    >
                      {header.isPlaceholder ? null : isSelect ? (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
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
                  className="group border-b border-border/50 last:border-0 transition-colors duration-200 ease-in-out hover:bg-transparent dark:hover:bg-transparent"
                >
                  {row.getVisibleCells().map((cell) => (
                    <DataTableCell
                      key={cell.id}
                      cell={cell}
                      row={row}
                      fieldMetadata={fieldMetadata}
                    />
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnsWithSelection.length}
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
