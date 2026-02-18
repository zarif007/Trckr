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
    editable?: boolean
    gridId?: string
  }
  const rowOriginal = row.original as Record<string, unknown>
  const rowValues = (() => {
    const base = { ...rowOriginal }
    const gridId = meta?.gridId
    const fieldMeta = fieldMetadata
    if (gridId && fieldMeta) {
      for (const columnId of Object.keys(fieldMeta)) {
        base[`${gridId}.${columnId}`] = rowOriginal[columnId]
      }
    }
    return base
  })()
  const isEditable = meta?.editable !== false
  const tableStyles = meta?.tableStyles
  const overrides =
    meta?.getFieldOverridesForRow?.(row.index, row.original as Record<string, unknown>, cell.column.id) ??
    meta?.getFieldOverrides?.(row.index, cell.column.id)
  const effectiveConfig = fieldInfo
    ? applyFieldOverrides(
      fieldInfo.config as Record<string, unknown> | null | undefined,
      overrides
    )
    : undefined
  const isHidden = !!effectiveConfig?.isHidden
  const isDisabled = !!effectiveConfig?.isDisabled
  const overrideValue = overrides && 'value' in overrides ? (overrides as { value?: unknown }).value : undefined

  const cellValue = cell.getValue()
  const [value, setValue] = useState<unknown>(() =>
    overrideValue !== undefined ? overrideValue : cellValue
  )
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const next = overrideValue !== undefined ? overrideValue : cellValue
    setValue((prev: unknown) => (Object.is(prev, next) ? prev : next))
  }, [cellValue, overrideValue])

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
    ? getValidationError({
      value,
      fieldId: cell.column.id,
      fieldType: fieldInfo.type,
      config: effectiveConfig,
      rules: fieldInfo.validations,
      rowValues,
    })
    : null
  const showError = dirty && !!validationError
  const isMultiselect = fieldInfo?.type === 'multiselect' || fieldInfo?.type === 'dynamic_multiselect'

  return (
    <TableCell
      style={{
        width: isSelect ? '44px' : undefined,
        minWidth: isSelect ? '44px' : '150px',
        ...(isMultiselect && { maxWidth: '150px' }),
      }}
      className={cn(
        "p-0 h-10 border-r border-border/50 last:border-r-0 relative group/cell transition-colors",
        !isSelect && "cursor-text hover:bg-muted/50 focus-within:bg-muted",
        isMultiselect && "overflow-hidden",
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
          <div className={cn(isMultiselect && "min-w-0 overflow-hidden w-full")}>
            <DataTableInput
              value={value}
              onChange={handleUpdate}
              type={fieldInfo.type}
              options={fieldInfo.options}
              config={effectiveConfig}
              disabled={!isEditable || isDisabled || overrideValue !== undefined}
              onAddOption={fieldInfo.onAddOption}
              optionsGridFields={fieldInfo.optionsGridFields}
              getBindingUpdatesFromRow={fieldInfo.getBindingUpdatesFromRow}
              className={tableStyles ? cn(tableStyles.fontSizeForInput, tableStyles.fontWeightForInput, tableStyles.textColorForInput) : undefined}
            />
          </div>
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
