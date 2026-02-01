import { Cell, Row, flexRender } from '@tanstack/react-table'
import { TableCell } from '@/components/ui/table'
import { DataTableInput } from './data-table-input'
import { FieldMetadata, getValidationError } from './utils'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

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
  }

  const [value, setValue] = useState(cell.getValue())
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setValue(cell.getValue())
  }, [cell.getValue()])

  const handleUpdate = (newValue: any) => {
    setDirty(true)
    setValue(newValue)
    meta?.updateData?.(row.index, cell.column.id, newValue)
  }

  const validationError = fieldInfo
    ? getValidationError(value, fieldInfo.type, fieldInfo.config)
    : null
  const showError = dirty && !!validationError

  return (
    <TableCell
      style={{
        width: isSelect ? '34px' : undefined,
        minWidth: isSelect ? '34px' : '150px',
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
        <DataTableInput
          value={value}
          onChange={handleUpdate}
          type={fieldInfo.type}
          options={fieldInfo.options}
          config={fieldInfo.config}
        />
      ) : (
        <div className="w-full h-full px-4 flex items-center text-[13px] text-foreground/90">
          <span className="truncate">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </span>
        </div>
      )}
    </TableCell>
  )
}

