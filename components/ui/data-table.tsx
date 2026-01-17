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
import {
  Type,
  Hash,
  Calendar,
  AlignLeft,
  CheckSquare,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldInput } from '@/app/components/FieldInput'

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
  onUpdate?: (rowIndex: number, columnId: string, value: any) => void
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
  onUpdate,
  fieldMetadata,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [editingCell, setEditingCell] = useState<{
    rowId: string
    columnId: string
  } | null>(null)
  const [editingValue, setEditingValue] = useState<any>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

  const handleCellEditSave = (rowIndex: number, columnId: string) => {
    if (editingValue !== null && onUpdate) {
      onUpdate(rowIndex, columnId, editingValue)
    }
    setEditingCell(null)
    setEditingValue(null)
  }

  const handleCellEditStart = (rowIndex: number, columnId: string) => {
    const rowId = `${rowIndex}`
    setEditingCell({ rowId, columnId })
    // @ts-ignore
    setEditingValue(data[rowIndex]?.[columnId] ?? '')
  }

  // Helper for checkbox direct updates
  const handleCheckboxChange = (rowIndex: number, columnId: string, value: boolean) => {
    onUpdate?.(rowIndex, columnId, value)
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
  })

  return (
    <div className="w-full space-y-4" ref={tableRef}>
      <div className="rounded-xl border border-border/60 bg-card/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-x-auto">
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
                        width: isSelect ? '44px' : '150px',
                        minWidth: isSelect ? '44px' : '150px',
                      }}
                      className={cn(
                        'h-9 text-muted-foreground font-medium text-[13px] border-r border-border/50 last:border-r-0',
                        isSelect ? 'p-0 w-[44px]' : 'px-4',
                      )}
                    >
                      {header.isPlaceholder ? null : isSelect ? (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          {Icon && (
                            <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                          )}
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
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
                  className="group border-b border-border/30 last:border-0 transition-colors duration-200 ease-in-out"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isSelect = cell.column.id === 'select'
                    const isEditing =
                      editingCell?.rowId === row.id &&
                      editingCell?.columnId === cell.column.id

                    const isBoolean =
                      fieldMetadata?.[cell.column.id]?.type === 'boolean'

                    return (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: isSelect ? '44px' : '150px',
                          minWidth: isSelect ? '44px' : '150px',
                        }}
                        className={cn(
                          'relative p-0 h-10 border-r border-border/10 last:border-r-0',
                          isEditing &&
                            'ring-1 ring-primary/20 bg-background shadow-lg z-20',
                        )}
                      >
                        {isSelect ? (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
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
                                    className="w-full h-full border-none shadow-none text-sm"
                                    autoFocus={true}
                                  />
                                ) : (
                                  <input
                                    autoFocus
                                    className="w-full h-full px-3 py-2 bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground/50"
                                    value={editingValue ?? ''}
                                    onChange={(e) => {
                                      setEditingValue(e.target.value)
                                    }}
                                    onBlur={() => {
                                      handleCellEditSave(
                                        row.index,
                                        cell.column.id,
                                      )
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter')
                                        handleCellEditSave(
                                          row.index,
                                          cell.column.id,
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
                              <div
                                className="w-full h-full px-4 flex items-center cursor-text text-[13px] text-foreground/90"
                                onClick={() => {
                                  if (!isBoolean) {
                                    handleCellEditStart(
                                      row.index,
                                      cell.column.id,
                                    )
                                  }
                                }}
                              >
                                {isBoolean ? (
                                  <Checkbox
                                    checked={cell.getValue() as boolean}
                                    onCheckedChange={(checked) => {
                                      handleCheckboxChange(
                                        row.index,
                                        cell.column.id,
                                        checked as boolean,
                                      )
                                    }}
                                  />
                                ) : (
                                  <span className="truncate">
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}
                                  </span>
                                )}
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
