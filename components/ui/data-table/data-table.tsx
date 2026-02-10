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
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Settings2, ChevronDown, Plus } from 'lucide-react'
import { FieldMetadata, getFieldIcon, getValidationError, sanitizeValue } from './utils'
import { DataTableCell } from './data-table-cell'
import { DataTableInput } from './data-table-input'
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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [rowDetailsOpenForIndex, setRowDetailsOpenForIndex] = useState<number | null>(null)
  const [rowDetailsTouchedFields, setRowDetailsTouchedFields] = useState<Set<string>>(new Set())

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

  const columnsWithSelectionAndActions = useMemo<ColumnDef<TData, TValue>[]>(
    () => [
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
      ...columns,
      {
        id: 'actions',
        size: 44,
        minSize: 44,
        maxSize: 44,
        header: ({ table }) => (
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
        ),
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
    [columns],
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
      columnVisibility,
    },
    meta: {
      updateData: onCellUpdate,
      fieldMetadata: fieldMetadata,
      tableStyles: ts,
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

  useEffect(() => {
    setRowDetailsTouchedFields(new Set())
  }, [rowDetailsOpenForIndex])

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
        />
        <Dialog
          open={rowDetailsOpenForIndex !== null}
          onOpenChange={(open) => !open && setRowDetailsOpenForIndex(null)}
        >
          <DialogContent
            className="sm:max-w-[540px] p-0 gap-0 overflow-hidden border-border/60 shadow-xl [--tw-shadow-color:rgba(0,0,0,0.12)] dark:[--tw-shadow-color:rgba(0,0,0,0.4)]"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            {/* Header with accent bar - edit mode */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-muted/30 via-transparent to-transparent">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg bg-muted-foreground/40" />
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Row Details
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Edit inline · Changes save automatically
                </DialogDescription>
              </DialogHeader>
            </div>

            {rowDetailsRow && (
              <>
                <div className="grid grid-cols-1 gap-4 px-6 py-5 max-h-[55vh] overflow-y-auto overscroll-contain">
                  {table
                    .getAllColumns()
                    .filter(
                      (col) => col.id !== 'select' && col.id !== 'actions',
                    )
                    .map((col, index) => {
                      const cell = rowDetailsRow
                        .getAllCells()
                        .find((c) => c.column.id === col.id)
                      const meta = table.options.meta as any
                      const fieldMetadata = meta?.fieldMetadata
                      const fieldInfo = fieldMetadata?.[col.id]
                      const value = cell
                        ? cell.getValue()
                        : rowDetailsRow.getValue(col.id)
                      const detailsTouched = rowDetailsTouchedFields.has(col.id)
                      const detailsError = fieldInfo
                        ? getValidationError(
                          value,
                          fieldInfo.type,
                          fieldInfo.config
                        )
                        : null
                      const detailsShowError = detailsTouched && !!detailsError
                      const Icon = fieldInfo ? getFieldIcon(fieldInfo.type) : null
                      const label =
                        typeof col.columnDef.header === 'string'
                          ? col.columnDef.header
                          : col.id

                      return (
                        <div
                          key={col.id}
                          className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
                          style={{
                            animationDelay: `${index * 30}ms`,
                            animationFillMode: 'both',
                          }}
                        >
                          <label className={cn('flex items-center gap-2 font-medium text-muted-foreground', ts.fontSize, ts.fontWeight, ts.textColor)}>
                            {Icon && (
                              <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                            )}
                            {label}
                            {fieldInfo?.config?.isRequired && (
                              <span className="text-destructive/80">*</span>
                            )}
                          </label>
                          <div className={cn('text-sm', ts.fontSize, ts.fontWeight, ts.textColor)}>
                            {fieldInfo ? (
                              <>
                                <div
                                  className={cn(
                                    'rounded-lg border bg-muted/30 focus-within:bg-background focus-within:ring-2 focus-within:ring-offset-1 transition-all duration-200',
                                    detailsShowError
                                      ? 'border-destructive/60 focus-within:ring-destructive/25'
                                      : 'border-border/50 focus-within:border-primary/30 focus-within:ring-primary/15'
                                  )}
                                  title={detailsError ?? undefined}
                                >
                                  <DataTableInput
                                    value={value}
                                    onChange={(newValue, options) => {
                                      setRowDetailsTouchedFields((prev) =>
                                        new Set([...prev, col.id])
                                      )
                                      const sanitized = sanitizeValue(
                                        newValue,
                                        fieldInfo.type,
                                        fieldInfo.config
                                      )
                                      const updateData = meta?.updateData
                                      updateData?.(rowDetailsRow.index, col.id, sanitized)
                                      const bindingUpdates =
                                        options?.bindingUpdates ??
                                        ((fieldInfo.type === 'options' || fieldInfo.type === 'multiselect') &&
                                          getBindingUpdates
                                          ? getBindingUpdates(col.id, sanitized) ?? {}
                                          : {})
                                      Object.entries(bindingUpdates).forEach(
                                        ([fieldId, val]) => updateData?.(rowDetailsRow.index, fieldId, val)
                                      )
                                    }}
                                    type={fieldInfo.type}
                                    options={fieldInfo.options}
                                    config={fieldInfo.config}
                                    onAddOption={fieldInfo.onAddOption}
                                    optionsGridFields={fieldInfo.optionsGridFields}
                                    getBindingUpdatesFromRow={fieldInfo.getBindingUpdatesFromRow}
                                    className={cn('h-10 px-3 bg-transparent border-0 focus-visible:ring-0 rounded-lg', ts.fontSizeForInput, ts.fontWeightForInput, ts.textColorForInput)}
                                  />
                                </div>
                                {detailsShowError && detailsError && (
                                  <p className="text-destructive text-xs mt-1">
                                    {detailsError}
                                  </p>
                                )}
                              </>
                            ) : cell ? (
                              <div className="rounded-lg border border-border/50 px-3 py-2.5 bg-muted/20">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-border/50 px-3 py-2.5 bg-muted/20">
                                {String(value)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>

                <DialogFooter className="flex flex-row justify-end gap-2 px-6 py-4 border-t border-border/40 bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRowDetailsOpenForIndex(null)}
                    className="min-w-[80px]"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
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
