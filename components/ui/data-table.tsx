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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Type,
  Hash,
  Calendar,
  AlignLeft,
  CheckSquare,
  List,
  Eraser,
  Zap,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import { FieldInput } from '@/app/components/FieldInput'

// Separate component for cell context menu
const CellContextMenu = ({ children }: { children: React.ReactNode }) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem>
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Zap className="mr-2 h-4 w-4" />
          Logic
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

type FieldType = 'string' | 'number' | 'date' | 'options' | 'boolean' | 'text'

interface FieldMetadata {
  [key: string]: {
    name: string
    type: FieldType
    options?: string[]
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onDataChange?: (data: TData[]) => void
  fieldMetadata?: FieldMetadata
}

const getFieldIcon = (type: FieldType) => {
  switch (type) {
    case 'string':
      return Type
    case 'number':
      return Hash
    case 'date':
      return Calendar
    case 'text':
      return AlignLeft
    case 'boolean':
      return CheckSquare
    case 'options':
      return List
    default:
      return Type
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onDataChange,
  fieldMetadata,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [editingCell, setEditingCell] = React.useState<{
    rowId: string
    columnId: string
  } | null>(null)
  const [editingValue, setEditingValue] = React.useState<any>(null)
  const [tableData, setTableData] = React.useState<TData[]>(data)
  const tableRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setTableData(data)
  }, [data])

  // Handle clicking outside the table to deselect rows and cells
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tableRef.current &&
        !tableRef.current.contains(event.target as Node)
      ) {
        setRowSelection({})
        setEditingCell(null)
        setEditingValue(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleCellEdit = (rowIndex: number, columnId: string, value: any) => {
    const newData = [...tableData]
    ;(newData[rowIndex] as any)[columnId] = value
    setTableData(newData)
    onDataChange?.(newData)
  }

  const handleCellEditStart = (rowIndex: number, columnId: string) => {
    const rowId = `${rowIndex}`
    setEditingCell({ rowId, columnId })
    setEditingValue((tableData[rowIndex] as any)[columnId] ?? '')
  }

  const handleCellEditSave = (rowIndex: number, columnId: string) => {
    handleCellEdit(rowIndex, columnId, editingValue)
    setEditingCell(null)
    setEditingValue(null)
  }

  const columnsWithSelection: ColumnDef<TData, TValue>[] = [
    {
      id: 'select',
      size: 44,
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
    <div className="w-full space-y-4" ref={tableRef}>
      <div className="rounded-md border border-border bg-transparent overflow-hidden">
        <Table className="table-fixed w-full border-collapse">
          <TableHeader className="bg-gray-50 dark:bg-black">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent border-b border-border"
              >
                {headerGroup.headers.map((header) => {
                  const isSelect = header.id === 'select'
                  const fieldType = fieldMetadata?.[header.id]?.type
                  const Icon = fieldType ? getFieldIcon(fieldType) : null

                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: isSelect ? '44px' : 'auto' }}
                      className={cn(
                        'h-11 text-foreground font-bold text-sm border-r border-border/50 last:border-r-0',
                        isSelect ? 'p-0' : 'px-4'
                      )}
                    >
                      {header.isPlaceholder ? null : isSelect ? (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          {Icon && (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                  className="group hover:bg-gray-50 dark:bg-black/10 border-b border-border/50 last:border-0 transition-colors"
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
                              <div className="w-full h-full">
                                {fieldMetadata &&
                                fieldMetadata[cell.column.id] ? (
                                  <FieldInput
                                    field={{
                                      name: fieldMetadata[cell.column.id].name,
                                      fieldName: cell.column.id,
                                      type: fieldMetadata[cell.column.id].type,
                                      options:
                                        fieldMetadata[cell.column.id].options,
                                    }}
                                    value={editingValue}
                                    onChange={(newValue) => {
                                      setEditingValue(newValue)
                                    }}
                                    isInline={true}
                                    className="w-full"
                                  />
                                ) : (
                                  <input
                                    autoFocus
                                    className="w-full h-full px-2 bg-transparent outline-none text-sm"
                                    value={editingValue ?? ''}
                                    onChange={(e) => {
                                      setEditingValue(e.target.value)
                                    }}
                                    onBlur={() => {
                                      handleCellEditSave(
                                        row.index,
                                        cell.column.id
                                      )
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter')
                                        handleCellEditSave(
                                          row.index,
                                          cell.column.id
                                        )
                                      if (e.key === 'Escape') {
                                        setEditingCell(null)
                                        setEditingValue(null)
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            ) : (
                              <CellContextMenu>
                                <div
                                  className="w-full h-full px-4 flex items-center cursor-text text-sm"
                                  onClick={() =>
                                    handleCellEditStart(
                                      row.index,
                                      cell.column.id
                                    )
                                  }
                                >
                                  <span className="truncate">
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </span>
                                </div>
                              </CellContextMenu>
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
