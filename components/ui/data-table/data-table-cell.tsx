import { Cell, Row, flexRender } from '@tanstack/react-table'
import { TableCell } from '@/components/ui/table'
import { DataTableInput } from './data-table-input'
import { FieldMetadata } from './utils'
import { useState, useEffect } from 'react'

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

  useEffect(() => {
    setValue(cell.getValue())
  }, [cell.getValue()])

  const handleUpdate = (newValue: any) => {
    setValue(newValue)
    meta?.updateData?.(row.index, cell.column.id, newValue)
  }

  return (
    <TableCell
      style={{
        width: isSelect ? '32px' : '150px',
        minWidth: isSelect ? '32px' : '150px',
      }}
      className="p-0 h-10 border-r-[1.5px] border-border/50 last:border-r-0 relative group/cell focus-within:bg-muted transition-colors"
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

