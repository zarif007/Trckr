import { Cell, Row, flexRender } from '@tanstack/react-table'
import { TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldMetadata } from './utils'

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
  const isBoolean = fieldMetadata?.[cell.column.id]?.type === 'boolean'

  return (
    <TableCell
      style={{
        width: isSelect ? '44px' : '150px',
        minWidth: isSelect ? '44px' : '150px',
      }}
      className="p-0 h-10 border-r border-border/50 last:border-r-0"
    >
      {isSelect ? (
        flexRender(cell.column.columnDef.cell, cell.getContext())
      ) : (
        <div className="w-full h-full px-4 flex items-center text-[13px] text-foreground/90">
          {isBoolean ? (
            <Checkbox checked={cell.getValue() as boolean} disabled />
          ) : (
            <span className="truncate">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </span>
          )}
        </div>
      )}
    </TableCell>
  )
}
