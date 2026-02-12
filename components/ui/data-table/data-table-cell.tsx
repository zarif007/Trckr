import { Cell, Row, flexRender } from '@tanstack/react-table'
import { TableCell } from '@/components/ui/table'
import { DataTableInput } from './data-table-input'
import { FieldMetadata, getValidationError } from './utils'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { DEFAULT_INPUT_FONT_CLASS, type ResolvedTableStyles } from '@/lib/style-utils'
import { applyFieldOverrides } from '@/lib/depends-on'

interface DataTableCellProps<TData, TValue> {
  cell: Cell<TData, any>
  row: Row<TData>
  fieldMetadata?: FieldMetadata
}

export function DataTableCell<TData, TValue>({
  cell,
  row,
  fieldMetadata,
}: DataTableCellProps<TData, TValue>) {
  const isSelect = cell.column.id === 'select'
  const fieldInfo = fieldMetadata?.[cell.column.id]
  const meta = cell.getContext().table.options.meta as {
    updateData?: (rowIndex: number, columnId: string, value: any) => void
    tableStyles?: ResolvedTableStyles
    getFieldOverrides?: (rowIndex: number, fieldId: string) => Record<string, unknown> | undefined
    getFieldOverridesForRow?: (
      rowIndex: number,
      rowData: Record<string, unknown>,
      fieldId: string
    ) => Record<string, unknown> | undefined
  }
  const tableStyles = meta?.tableStyles
  const overrides =
    meta?.getFieldOverridesForRow?.(row.index, row.original as Record<string, unknown>, cell.column.id) ??
    meta?.getFieldOverrides?.(row.index, cell.column.id)
  const effectiveConfig = fieldInfo ? applyFieldOverrides(fieldInfo.config, overrides) : undefined
  const isHidden = !!effectiveConfig?.isHidden
  const isDisabled = !!effectiveConfig?.isDisabled

  const [value, setValue] = useState(cell.getValue())
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setValue(cell.getValue())
  }, [cell.getValue()])

  const handleUpdate = (newValue: any, options?: { bindingUpdates?: Record<string, unknown> }) => {
    setDirty(true)
    setValue(newValue)
    meta?.updateData?.(row.index, cell.column.id, newValue)
    const bindingUpdates = options?.bindingUpdates ?? {}
    Object.entries(bindingUpdates).forEach(([fieldId, val]) =>
      meta?.updateData?.(row.index, fieldId, val)
    )
  }

  const validationError = fieldInfo
    ? getValidationError(value, fieldInfo.type, effectiveConfig)
    : null
  const showError = dirty && !!validationError

  return (
    <TableCell
      style={{
        width: isSelect ? '44px' : undefined,
        minWidth: isSelect ? '44px' : '150px',
      }}
      className={cn(
        "p-0 h-10 border-r border-border/50 last:border-r-0 relative group/cell transition-colors",
        !isSelect && "cursor-text hover:bg-muted/50 focus-within:bg-muted",
        showError && "ring-2 ring-destructive ring-inset"
      )}
      title={showError ? validationError! : undefined}
    >
      {isSelect ? (
        <div className="flex items-center justify-center w-full h-full">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      ) : fieldInfo ? (
        isHidden ? null : (
          <DataTableInput
            value={value}
            onChange={handleUpdate}
            type={fieldInfo.type}
            options={fieldInfo.options}
            config={effectiveConfig}
            disabled={isDisabled}
            onAddOption={fieldInfo.onAddOption}
            optionsGridFields={fieldInfo.optionsGridFields}
            getBindingUpdatesFromRow={fieldInfo.getBindingUpdatesFromRow}
            className={tableStyles ? cn(tableStyles.fontSizeForInput, tableStyles.fontWeightForInput, tableStyles.textColorForInput) : undefined}
          />
        )
      ) : (
        <div className={cn('w-full h-full px-4 flex items-center text-foreground/90', tableStyles?.fontSize ?? DEFAULT_INPUT_FONT_CLASS, tableStyles?.fontWeight, tableStyles?.textColor)}>
          <span className="truncate">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </span>
        </div>
      )}
    </TableCell>
  )
}
