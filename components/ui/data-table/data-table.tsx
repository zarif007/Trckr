'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
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
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Settings2, ChevronDown, Plus } from 'lucide-react'
import { FieldMetadata, getFieldIcon } from './utils'
import { DataTableCell } from './data-table-cell'
import { EntryFormDialog } from './entry-form-dialog'
import type { StyleOverrides } from '@/app/components/tracker-display/types'
import { resolveTableStyles } from '@/lib/style-utils'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  fieldMetadata?: FieldMetadata
  onCellUpdate?: (rowIndex: number, columnId: string, value: any) => void
  onAddEntry?: (newRow: Record<string, any>) => void
  onDeleteEntries?: (rowIndices: number[]) => void
  config?: any
  /** Optional style overrides for this table. */
  styleOverrides?: StyleOverrides
  /** For Add Entry dialog: when a select/multiselect changes, return binding updates to merge into form. */
  getBindingUpdates?: (fieldId: string, value: unknown) => Record<string, unknown>
  /** For table cells/row details: resolve per-row field overrides (hidden/required/disabled). */
  getFieldOverrides?: (rowIndex: number, fieldId: string) => Record<string, unknown> | undefined
  /** For table cells/row details: resolve overrides using the current row values. */
  getFieldOverridesForRow?: (
    rowIndex: number,
    rowData: Record<string, unknown>,
    fieldId: string
  ) => Record<string, unknown> | undefined
  /** For Add Entry dialog: resolve field overrides based on current form values. */
  getFieldOverridesForAdd?: (values: Record<string, unknown>, fieldId: string) => Record<string, unknown> | undefined
  /** Force-hide specific columns (e.g., conditional visibility). */
  hiddenColumns?: string[]
  /** When false, hide Add Entry button and add-dialog. Default true. */
  addable?: boolean
  /** When false, cells and row details are read-only. Default true. */
  editable?: boolean
  /** When false, hide Delete button and row selection. Default true. */
  deleteable?: boolean
  /** When false, hide column visibility / grid layout settings. Default true. */
  editLayoutAble?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  fieldMetadata,
  onCellUpdate,
  onAddEntry,
  onDeleteEntries,
  getBindingUpdates,
  styleOverrides,
  getFieldOverrides,
  getFieldOverridesForRow,
  getFieldOverridesForAdd,
  hiddenColumns,
  addable = true,
  editable = true,
  deleteable = true,
  editLayoutAble = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [rowDetailsOpenForIndex, setRowDetailsOpenForIndex] = useState<number | null>(null)

  const selectedRows = Object.keys(rowSelection)
    .map(Number)
    .filter((idx) => rowSelection[idx])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => {
      const initialVisibility: VisibilityState = {}
      columns.forEach((col, index) => {
        // @ts-ignore - accessorKey might not exist on all column types but usually does for data columns
        const key = col.id || col.accessorKey || index.toString()
        if (key) {
          initialVisibility[key] = index < 5
        }
      })
      return initialVisibility
    },
  )

  const forcedHidden = useMemo(() => new Set(hiddenColumns ?? []), [hiddenColumns])
  const effectiveVisibility = useMemo(() => {
    const next: VisibilityState = { ...columnVisibility }
    forcedHidden.forEach((colId) => {
      next[colId] = false
    })
    return next
  }, [columnVisibility, forcedHidden])

  const columnsWithSelectionAndActions = useMemo<ColumnDef<TData, TValue>[]>(
    () => [
      ...(deleteable
        ? [
          {
            id: 'select',
            size: 44,
            minSize: 44,
            maxSize: 44,
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
        ]
        : []),
      ...columns,
      {
        id: 'actions',
        size: 44,
        minSize: 44,
        maxSize: 44,
        header: ({ table }) =>
          editLayoutAble ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="sr-only">View settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-[300px]"
                onInteractOutside={(e) => e.preventDefault()}
              >
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
                          column.getCanHide(),
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
          ) : null,
        cell: ({ row }) => {
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={() => setRowDetailsOpenForIndex(row.index)}
            >
              <ChevronDown className="h-4 w-4" />
              <span className="sr-only">View full details</span>
            </Button>
          )
        },
      } as ColumnDef<TData, TValue>,
    ],
    [columns, deleteable, editLayoutAble],
  )

  const ts = useMemo(() => resolveTableStyles(styleOverrides), [styleOverrides])

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
      columnVisibility: effectiveVisibility,
    },
    meta: {
      updateData: editable ? onCellUpdate : undefined,
      fieldMetadata: fieldMetadata,
      tableStyles: ts,
      getFieldOverrides,
      getFieldOverridesForRow,
      editable,
    },
  })

  const fixedWidth = '44px'

  const handleAddEntry = (values: Record<string, any>) => {
    onAddEntry?.(values)
    setShowAddDialog(false)
  }

  const handleAddEntryAndStayOpen = (values: Record<string, any>) => {
    onAddEntry?.(values)
    // Keep the dialog open for the next entry; EntryFormDialog will reset its form state.
  }

  const handleDeleteSelected = () => {
    onDeleteEntries?.(selectedRows)
    setRowSelection({})
    setDeleteConfirmOpen(false)
  }

  const rowDetailsRow =
    rowDetailsOpenForIndex != null
      ? table.getRowModel().rows[rowDetailsOpenForIndex]
      : null

  const handleEditSave = useCallback(
    (values: Record<string, unknown>) => {
      if (rowDetailsOpenForIndex == null) return
      const updateData = (table.options.meta as any)?.updateData
      Object.entries(values).forEach(([fieldId, val]) =>
        updateData?.(rowDetailsOpenForIndex, fieldId, val)
      )
      setRowDetailsOpenForIndex(null)
    },
    [rowDetailsOpenForIndex, table.options.meta]
  )

  const addFieldOrder = useMemo(
    () =>
      columns.map(
        (col) =>
          (col as { id?: string; accessorKey?: string }).id ||
          (col as { id?: string; accessorKey?: string }).accessorKey ||
          ''
      ),
    [columns]
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-end gap-2">
        {deleteable && (
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedRows.length === 0}
              >
                Delete ({selectedRows.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Delete Entries</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete {selectedRows.length} row
                  {selectedRows.length !== 1 ? 's' : ''}? This action cannot be
                  undone.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {addable && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => setShowAddDialog(true)}
              className="shadow-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Entry
            </Button>
            <EntryFormDialog
              open={showAddDialog}
              onOpenChange={setShowAddDialog}
              title="Add New Entry"
              submitLabel="Add Entry"
              fieldMetadata={fieldMetadata ?? {}}
              fieldOrder={addFieldOrder}
              initialValues={{}}
              onSave={handleAddEntry}
              onSaveAnother={handleAddEntryAndStayOpen}
              getBindingUpdates={getBindingUpdates}
              getFieldOverrides={getFieldOverridesForAdd}
            />
          </>
        )}
        <EntryFormDialog
          open={rowDetailsOpenForIndex !== null}
          onOpenChange={(open) => !open && setRowDetailsOpenForIndex(null)}
          title="Row Details"
          submitLabel="Done"
          fieldMetadata={fieldMetadata ?? {}}
          fieldOrder={addFieldOrder}
          initialValues={
            rowDetailsRow
              ? { ...(rowDetailsRow.original as Record<string, unknown>) }
              : {}
          }
          onSave={handleEditSave}
          getBindingUpdates={getBindingUpdates}
          getFieldOverrides={getFieldOverridesForAdd}
          mode="edit"
        />
      </div>
      <div className={cn('rounded-md overflow-x-auto', ts.borderStyle, ts.accentBorder, ts.tableBg || 'bg-card/50')}>
        <Table className={cn('w-full min-w-max border-collapse', ts.fontSize, ts.fontWeight, ts.textColor, ts.tableBg && 'bg-transparent')}>
          <TableHeader className={ts.headerBg}>
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

                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: isSelect || isActions ? fixedWidth : undefined,
                        minWidth: isSelect || isActions ? fixedWidth : undefined,
                      }}
                      className={cn(
                        ts.headerHeight,
                        'text-muted-foreground font-medium border-r border-border/50 last:border-r-0',
                        ts.headerFontSize,
                        isSelect || isActions
                          ? 'p-0 text-center min-w-[44px] w-[44px]'
                          : ts.cellPadding,
                      )}
                    >
                      {header.isPlaceholder ? null : isSelect || isActions ? (
                        <div className="flex items-center justify-center w-full h-full">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
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
                              header.getContext(),
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
          <TableBody className={ts.tableBg ? 'bg-transparent' : undefined}>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIdx) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'group border-b border-border/50 last:border-0 transition-colors duration-200 ease-in-out hover:bg-transparent dark:hover:bg-transparent',
                    ts.tableBg && '!bg-transparent',
                    ts.stripedRows && rowIdx % 2 === 1 && 'bg-muted/30',
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === 'actions') {
                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width: fixedWidth, minWidth: fixedWidth }}
                          className="p-0 text-center align-middle h-full border-r border-border/50 last:border-r-0 min-w-[44px]"
                        >
                          <div className="flex items-center justify-center w-full h-full min-h-[inherit]">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
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
