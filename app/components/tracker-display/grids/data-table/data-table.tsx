"use client";

import { useState, useMemo, useCallback, useEffect, useId } from "react";
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
  type PaginationState,
  type OnChangeFn,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import {
  Settings2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { FieldMetadata, getFieldIcon } from "./utils";
import { DataTableCell } from "./data-table-cell";
import {
  EntryFormDialog,
  type EntryFormSavePayload,
} from "./entry-form-dialog";
import {
  ROW_ACCENT_HEX_CLIENT_KEY,
  parseRowAccentHex,
  rowAccentStyleFromRow,
} from "@/lib/tracker-grid-rows";
import { EntryWayButton } from "../../entry-way/EntryWayButton";
import type { EntryWayDefinition } from "../../entry-way/entry-way-types";
import type { FieldCalculationRule } from "@/lib/functions/types";
import type { FieldRuleOverride } from "@/lib/field-rules";
import type { ReactNode } from "react";

/** Map a table row back to its index in grid data (selection uses getRowId, not indices). */
function resolveGridDataRowIndex<TData>(
  original: TData,
  data: readonly TData[],
): number {
  const rec = original as Record<string, unknown>;
  const idKey = rec._rowId ?? rec.row_id ?? rec.id;
  if (
    idKey != null &&
    (typeof idKey === "number" || typeof idKey === "string")
  ) {
    const idx = data.findIndex((r) => {
      const o = r as Record<string, unknown>;
      return (
        o._rowId === idKey || o.row_id === idKey || o.id === idKey
      );
    });
    if (idx >= 0) return idx;
  }
  const byRef = data.indexOf(original);
  return byRef >= 0 ? byRef : -1;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  fieldMetadata?: FieldMetadata;
  onCellUpdate?: (rowIndex: number, columnId: string, value: any) => void;
  /**
   * When set (e.g. row HTTP API), Row Details "Done" merges all fields and calls this once
   * instead of invoking `onCellUpdate` per field (avoids parallel PATCH races).
   */
  onSaveEditedRow?: (
    rowIndex: number,
    values: Record<string, unknown>,
  ) => void;
  onAddEntry?: (newRow: Record<string, any>) => void;
  onDeleteEntries?: (rowIndices: number[]) => void;
  config?: any;
  /** For Add Entry dialog: when a select/multiselect changes, return binding updates to merge into form. */
  getBindingUpdates?: (
    fieldId: string,
    value: unknown,
  ) => Record<string, unknown>;
  /** For table cells/row details: resolve per-row field overrides (hidden/required/disabled). */
  getFieldOverrides?: (
    rowIndex: number,
    fieldId: string,
  ) => FieldRuleOverride | undefined;
  /** For table cells: resolve all field overrides for a row in one call. */
  getRowOverrides?: (
    rowIndex: number,
    rowData: Record<string, unknown>,
  ) => Record<string, FieldRuleOverride> | undefined;
  /** For table cells/row details: resolve overrides using the current row values. */
  getFieldOverridesForRow?: (
    rowIndex: number,
    rowData: Record<string, unknown>,
    fieldId: string,
  ) => FieldRuleOverride | undefined;
  /** For Add Entry dialog: resolve field overrides based on current form values. */
  getFieldOverridesForAdd?: (
    values: Record<string, unknown>,
    fieldId: string,
  ) => FieldRuleOverride | undefined;
  /** Force-hide specific columns (e.g., conditional visibility). */
  hiddenColumns?: string[];
  /** When false, hide Add Entry button and add-dialog. Default true. */
  addable?: boolean;
  /** When false, cells and row details are read-only. Default true. */
  editable?: boolean;
  /** When false, hide Delete button and row selection. Default true. */
  deletable?: boolean;
  /** When false, hide column visibility / grid layout settings. Default true. */
  editLayoutAble?: boolean;
  /** Grid id for validation rowValues (expr rules may use gridId.fieldId). */
  gridId?: string;
  /** Calculations keyed by "gridId.fieldId" (target paths). */
  calculations?: Record<string, FieldCalculationRule>;
  /** Full grid data for accumulate (sum/reduce) rules in Add/Edit entry forms. */
  gridData?: Record<string, Array<Record<string, unknown>>>;
  /** Default page size. Default 10. */
  pageSize?: number;
  /** Optional page size options for selector (e.g. [10, 25, 50]). */
  pageSizeOptions?: number[];
  /** Server-driven pagination: parent owns page index / count. */
  manualPagination?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  /** When manualPagination, total row count across all pages (for footer). */
  totalRows?: number;
  /** Replace table body with skeleton rows (e.g. server pagination fetch). */
  isLoading?: boolean;
  /** Initial sort (column id and direction). */
  defaultSort?: { id: string; desc?: boolean };
  /** Optional custom renderer for the action column cell. */
  renderRowAction?: (args: { row: TData; rowIndex: number }) => ReactNode;
  /** When false and no custom action is provided, hide the actions column. */
  showRowDetails?: boolean;
  /** Optional Entry Way shortcuts for quick-create. */
  entryWays?: EntryWayDefinition[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  fieldMetadata,
  onCellUpdate,
  onSaveEditedRow,
  onAddEntry,
  onDeleteEntries,
  getBindingUpdates,
  getFieldOverrides,
  getRowOverrides,
  getFieldOverridesForRow,
  getFieldOverridesForAdd,
  hiddenColumns,
  addable = true,
  editable = true,
  deletable = true,
  editLayoutAble = true,
  gridId,
  calculations,
  gridData: gridDataProp,
  pageSize: pageSizeProp,
  pageSizeOptions = [10, 25, 50],
  manualPagination = false,
  pageCount: pageCountProp,
  pagination: controlledPagination,
  onPaginationChange,
  totalRows: totalRowsProp,
  isLoading = false,
  defaultSort: defaultSortProp,
  renderRowAction,
  showRowDetails = true,
  entryWays = [],
}: DataTableProps<TData, TValue>) {
  const pageSizeSelectLabelId = useId();
  const pageSize = pageSizeProp ?? 10;
  const [tableData, setTableData] = useState<TData[]>(data);
  const [sorting, setSorting] = useState<SortingState>(() =>
    defaultSortProp
      ? [{ id: defaultSortProp.id, desc: defaultSortProp.desc ?? false }]
      : [],
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [uncontrolledPagination, setUncontrolledPagination] =
    useState<PaginationState>({
      pageIndex: 0,
      pageSize,
    });

  useEffect(() => {
    setUncontrolledPagination((p) =>
      p.pageSize === pageSize ? p : { ...p, pageSize, pageIndex: 0 },
    );
  }, [pageSize]);

  const paginationState: PaginationState =
    controlledPagination ?? uncontrolledPagination;

  const effectivePageSizeOptions = useMemo(() => {
    const cur = paginationState.pageSize;
    const base = pageSizeOptions.length > 0 ? pageSizeOptions : [10, 25, 50];
    const uniq = new Set([...base, cur]);
    return [...uniq].sort((a, b) => a - b);
  }, [pageSizeOptions, paginationState.pageSize]);

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (onPaginationChange) {
      onPaginationChange(updater);
      return;
    }
    setUncontrolledPagination((prev) =>
      typeof updater === "function" ? updater(prev) : updater,
    );
  };
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [rowDetailsOpenForIndex, setRowDetailsOpenForIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    setTableData((prev) => (prev === data ? prev : data));
  }, [data]);

  const selectedRowCount = Object.values(rowSelection).filter(Boolean).length;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => {
      const initialVisibility: VisibilityState = {};
      columns.forEach((col, index) => {
        const key =
          col.id ??
          (col as { accessorKey?: string }).accessorKey ??
          index.toString();
        if (key) {
          initialVisibility[key] = index < 5;
        }
      });
      return initialVisibility;
    },
  );

  const forcedHidden = useMemo(
    () => new Set(hiddenColumns ?? []),
    [hiddenColumns],
  );
  const effectiveVisibility = useMemo(() => {
    const next: VisibilityState = { ...columnVisibility };
    forcedHidden.forEach((colId) => {
      next[colId] = false;
    });
    return next;
  }, [columnVisibility, forcedHidden]);

  const columnsWithSelectionAndActions = useMemo<
    ColumnDef<TData, TValue>[]
  >(() => {
    const actionColumnEnabled = Boolean(renderRowAction) || showRowDetails;
    return [
      ...(deletable
        ? [
            {
              id: "select",
              size: 44,
              minSize: 44,
              maxSize: 44,
              header: ({ table }) => (
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={
                      table.getIsAllPageRowsSelected() ||
                      (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) =>
                      table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Select all rows on this page"
                  />
                </div>
              ),
              cell: ({ row }) => (
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label={`Select row ${row.index + 1}`}
                  />
                </div>
              ),
            } as ColumnDef<TData, TValue>,
          ]
        : []),
      ...columns,
      ...(actionColumnEnabled
        ? [
            {
              id: "actions",
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
                                typeof column.accessorFn !== "undefined" &&
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
                                    {typeof column.columnDef.header === "string"
                                      ? column.columnDef.header
                                      : column.id}
                                  </label>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : null,
              cell: ({ row }) => {
                if (renderRowAction) {
                  return (
                    <div className="flex items-center justify-center w-full h-full min-h-[inherit]">
                      {renderRowAction({
                        row: row.original as TData,
                        rowIndex: row.index,
                      })}
                    </div>
                  );
                }
                if (!showRowDetails) return null;
                return (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0"
                    onClick={() => setRowDetailsOpenForIndex(row.index)}
                    aria-label={`View full details for row ${row.index + 1}`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                );
              },
            } as ColumnDef<TData, TValue>,
          ]
        : []),
    ];
  }, [columns, deletable, editLayoutAble, renderRowAction, showRowDetails]);

  const updateDraftCell = useCallback(
    (rowIndex: number, columnId: string, value: any) => {
      setTableData((prev) =>
        prev.map((row, idx) =>
          idx === rowIndex
            ? ({ ...(row as any), [columnId]: value } as TData)
            : row,
        ),
      );
      onCellUpdate?.(rowIndex, columnId, value);
    },
    [onCellUpdate],
  );

  const table = useReactTable({
    data: tableData,
    columns: columnsWithSelectionAndActions,
    getRowId: (row, index) =>
      String(
        (row as Record<string, unknown>)._rowId ??
          (row as Record<string, unknown>).row_id ??
          (row as Record<string, unknown>).id ??
          index,
      ),
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
    manualPagination,
    pageCount: manualPagination ? pageCountProp : undefined,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
    state: {
      sorting,
      rowSelection,
      columnVisibility: effectiveVisibility,
      pagination: paginationState,
    },
    onPaginationChange: handlePaginationChange,
    meta: {
      updateData: editable ? updateDraftCell : undefined,
      fieldMetadata: fieldMetadata,
      getFieldOverrides,
      getFieldOverridesForRow,
      editable,
      gridId,
    },
  });

  const fixedWidth = "44px";

  const mergeRowAccentOntoValues = useCallback(
    (payload: EntryFormSavePayload): Record<string, unknown> => {
      const next = { ...payload.values };
      if (payload.rowAccentHex != null)
        next[ROW_ACCENT_HEX_CLIENT_KEY] = payload.rowAccentHex;
      else delete next[ROW_ACCENT_HEX_CLIENT_KEY];
      return next;
    },
    [],
  );

  const handleAddEntry = (payload: EntryFormSavePayload) => {
    onAddEntry?.(mergeRowAccentOntoValues(payload));
    setShowAddDialog(false);
  };

  const handleAddEntryAndStayOpen = (payload: EntryFormSavePayload) => {
    onAddEntry?.(mergeRowAccentOntoValues(payload));
    // Keep the dialog open for the next entry; EntryFormDialog will reset its form state.
  };

  const handleDeleteSelected = () => {
    const indices = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => resolveGridDataRowIndex(row.original, tableData))
      .filter((i) => i >= 0);
    onDeleteEntries?.(indices);
    setRowSelection({});
    setDeleteConfirmOpen(false);
  };

  /** `row.index` is global in `data`; paginated `getRowModel().rows` is sliced — find by index, not by array position. */
  const rowDetailsRow = useMemo(() => {
    if (rowDetailsOpenForIndex == null) return null;
    return (
      table
        .getRowModel()
        .rows.find((r) => r.index === rowDetailsOpenForIndex) ?? null
    );
  }, [rowDetailsOpenForIndex, table]);

  const handleEditSave = useCallback(
    (payload: EntryFormSavePayload) => {
      if (rowDetailsOpenForIndex == null) return;
      const merged = mergeRowAccentOntoValues(payload);
      if (onSaveEditedRow) {
        onSaveEditedRow(rowDetailsOpenForIndex, merged);
        setRowDetailsOpenForIndex(null);
        return;
      }
      const updateData = (table.options.meta as any)?.updateData;
      Object.entries(payload.values).forEach(([fieldId, val]) =>
        updateData?.(rowDetailsOpenForIndex, fieldId, val),
      );
      updateData?.(
        rowDetailsOpenForIndex,
        ROW_ACCENT_HEX_CLIENT_KEY,
        payload.rowAccentHex,
      );
      setRowDetailsOpenForIndex(null);
    },
    [
      rowDetailsOpenForIndex,
      mergeRowAccentOntoValues,
      onSaveEditedRow,
      table.options.meta,
    ],
  );

  const addFieldOrder = useMemo(
    () =>
      columns.map(
        (col) =>
          (col as { id?: string; accessorKey?: string }).id ||
          (col as { id?: string; accessorKey?: string }).accessorKey ||
          "",
      ),
    [columns],
  );

  const hasActions = addable || deletable;

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const { pageIndex: footerPageIndex, pageSize: footerPageSize } =
    paginationState;
  const resolvedPageCount = Math.max(1, table.getPageCount());
  const footerRangeStart =
    filteredRowCount === 0 ? 0 : footerPageIndex * footerPageSize + 1;
  const footerRangeEnd = Math.min(
    (footerPageIndex + 1) * footerPageSize,
    filteredRowCount,
  );

  return (
    <div className="w-full">
      {hasActions && (
        <div className="flex h-8 items-center justify-end gap-0.5 pb-2">
          {deletable && (
            <>
              <Popover open={bulkOpen} onOpenChange={setBulkOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={selectedRowCount === 0}
                    className="h-7 min-w-0 gap-1 px-2 text-xs font-normal text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
                    aria-label="Bulk actions"
                  >
                    Bulk
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className={cn(
                    "w-52 rounded-sm border p-1.5",
                    theme.border.gridChrome,
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 justify-start gap-2 rounded-sm px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setBulkOpen(false);
                        setDeleteConfirmOpen(true);
                      }}
                      aria-label={`Delete ${selectedRowCount} selected`}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      Delete {selectedRowCount} selected
                    </Button>
                    {/* Add more bulk actions here later, e.g. Duplicate, Export selected */}
                  </div>
                </PopoverContent>
              </Popover>
              <Dialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
              >
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Delete Entries</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to delete {selectedRowCount} row
                      {selectedRowCount !== 1 ? "s" : ""}? This action cannot be
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                    >
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          {addable && (
            <>
              <EntryWayButton
                onNewEntryClick={() => setShowAddDialog(true)}
                entryWays={entryWays}
                // For now, Entry Ways are just visible options; clicking does not create rows yet.
                onSelectEntryWay={() => {}}
                disabled={!onAddEntry}
              />
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
                gridId={gridId}
                calculations={calculations}
                gridData={gridDataProp}
              />
            </>
          )}
        </div>
      )}
      <EntryFormDialog
        key={rowDetailsRow?.id ?? "row-details"}
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
        initialRowAccentHex={
          rowDetailsRow
            ? parseRowAccentHex(
                (rowDetailsRow.original as Record<string, unknown>)[
                  ROW_ACCENT_HEX_CLIENT_KEY
                ],
              )
            : null
        }
        onSave={handleEditSave}
        getBindingUpdates={getBindingUpdates}
        getFieldOverrides={getFieldOverridesForAdd}
        gridId={gridId}
        calculations={calculations}
        gridData={gridDataProp}
        mode="edit"
      />
      <div
        className={cn(
          "rounded-sm overflow-x-auto border bg-card/40",
          theme.border.gridChrome,
        )}
        aria-busy={isLoading || undefined}
      >
        <Table
          className={cn(
            "w-full min-w-max border-collapse",
          )}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={cn(
                  "bg-muted/20 hover:bg-muted/20 border-b",
                  theme.border.gridChrome,
                )}
              >
                {headerGroup.headers.map((header) => {
                  const isSelect = header.id === "select";
                  const isActions = header.id === "actions";
                  const fieldType = fieldMetadata?.[header.id]?.type;
                  const Icon = fieldType ? getFieldIcon(fieldType) : null;

                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: isSelect || isActions ? fixedWidth : undefined,
                        minWidth:
                          isSelect || isActions ? fixedWidth : undefined,
                      }}
                      className={cn(
                        "text-muted-foreground/90 font-medium border-r last:border-r-0 text-xs",
                        theme.border.gridChrome,
                        isSelect || isActions
                          ? "p-0 text-center min-w-[44px] w-[44px]"
                          : "px-3 py-2",
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
                            <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
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
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from(
                {
                  length: Math.min(
                    Math.max(1, paginationState.pageSize),
                    50,
                  ),
                },
                (_, skeletonRowIdx) => (
                  <TableRow
                    key={`skeleton-row-${skeletonRowIdx}`}
                    className={cn(
                      "border-b last:border-0",
                      theme.border.gridChrome,
                    )}
                  >
                    {columnsWithSelectionAndActions.map((col, ci) => {
                      const colId =
                        (col as { id?: string }).id ??
                        (col as { accessorKey?: string }).accessorKey ??
                        String(ci);
                      const narrow =
                        colId === "select" || colId === "actions";
                      return (
                        <TableCell
                          key={`${skeletonRowIdx}-${colId}`}
                          style={
                            narrow
                              ? { width: fixedWidth, minWidth: fixedWidth }
                              : undefined
                          }
                          className={cn(
                            narrow
                              ? "p-0 text-center align-middle border-r last:border-r-0 min-w-[44px]"
                              : "px-3 py-2.5 border-r last:border-r-0",
                            theme.border.gridChrome,
                          )}
                        >
                          {narrow ? (
                            <div className="flex items-center justify-center py-2">
                              <div
                                className="h-4 w-4 shrink-0 animate-pulse rounded-sm bg-muted/60"
                                aria-hidden
                              />
                            </div>
                          ) : (
                            <div
                              className="h-4 max-w-full animate-pulse rounded-sm bg-muted/60"
                              style={{
                                width: `${42 + ((skeletonRowIdx + ci) % 6) * 9}%`,
                              }}
                              aria-hidden
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ),
              )
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowOriginal = row.original as Record<string, unknown>;
                const rowValues: Record<string, unknown> = { ...rowOriginal };
                if (gridId && fieldMetadata) {
                  for (const columnId of Object.keys(fieldMetadata)) {
                    rowValues[`${gridId}.${columnId}`] = rowOriginal[columnId];
                  }
                }
                const rowOverrides = getRowOverrides?.(row.index, rowOriginal);

                const rowAccentStyle = rowAccentStyleFromRow(rowOriginal);
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    style={rowAccentStyle}
                    className={cn(
                      "group border-b last:border-0 transition-colors duration-150 hover:bg-muted/10 dark:hover:bg-muted/8",
                      theme.border.gridChrome,
                      rowAccentStyle
                        ? "hover:brightness-[1.02] dark:hover:brightness-[1.03]"
                        : null,
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === "actions") {
                        return (
                          <TableCell
                            key={cell.id}
                            style={{ width: fixedWidth, minWidth: fixedWidth }}
                            className={cn(
                              "p-0 text-center align-middle h-full border-r last:border-r-0 min-w-[44px]",
                              theme.border.gridChrome,
                            )}
                          >
                            <div className="flex items-center justify-center w-full h-full min-h-[inherit]">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </div>
                          </TableCell>
                        );
                      }
                      return (
                        <DataTableCell
                          key={cell.id}
                          cell={cell}
                          row={row}
                          fieldMetadata={fieldMetadata}
                          rowValues={rowValues}
                          rowOverrides={rowOverrides}
                        />
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnsWithSelectionAndActions.length}
                  className="h-24 text-center text-muted-foreground/60 text-sm"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-t px-3 py-1.5",
            theme.border.gridChrome,
          )}
        >
          <p
            className={cn(
              theme.typography.captionMuted,
              "min-w-0 shrink truncate tabular-nums",
            )}
          >
            {filteredRowCount === 0
              ? "—"
              : manualPagination
                ? `${footerPageIndex + 1}/${resolvedPageCount}` +
                  (totalRowsProp != null
                    ? ` · ${totalRowsProp.toLocaleString()}`
                    : "")
                : `${footerRangeStart.toLocaleString()}–${footerRangeEnd.toLocaleString()}/${filteredRowCount.toLocaleString()}`}
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            {effectivePageSizeOptions.length > 0 ? (
              <>
                <span className="sr-only" id={pageSizeSelectLabelId}>
                  Rows per page
                </span>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  disabled={isLoading}
                  onValueChange={(value) => {
                    const next = parseInt(value, 10);
                    if (!Number.isNaN(next)) table.setPageSize(next);
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    aria-labelledby={pageSizeSelectLabelId}
                    className={cn(
                      "h-7 min-w-0 rounded-sm border-0 bg-transparent px-1.5 text-xs shadow-none hover:bg-muted/50",
                      "focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                      "data-[size=sm]:h-7 data-[size=sm]:min-h-7",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {effectivePageSizeOptions.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || isLoading}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || isLoading}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
