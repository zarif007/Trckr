import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import { TrackerGrid, TrackerField } from './types'
import { TrackerCell } from './tracker-cell'
import { resolveFieldOptions } from './resolve-options'

interface TrackerTableGridProps {
  grid: TrackerGrid & { fields: TrackerField[] }
  rows: Array<Record<string, unknown>>
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
  onDeleteEntries?: (rowIndices: number[]) => void
}

export function TrackerTableGrid({
  grid,
  rows,
  gridData,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: TrackerTableGridProps) {
  if (grid.fields.length === 0) return null

  const fieldMetadata: FieldMetadata = {}
  grid.fields.forEach((field) => {
    fieldMetadata[field.key] = {
      name: field.ui.label,
      type: field.dataType,
      options: resolveFieldOptions(field, gridData),
    }
  })

  const columns: ColumnDef<Record<string, unknown>>[] = grid.fields.map(
    (field) => ({
      id: field.key,
      accessorKey: field.key,
      header: field.ui.label,
      cell: ({ row }) => {
        const value = row.getValue(field.key)
        return (
          <TrackerCell
            value={value}
            type={field.dataType}
            options={resolveFieldOptions(field, gridData)}
          />
        )
      },
    }),
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      fieldMetadata={fieldMetadata}
      onCellUpdate={onUpdate}
      onAddEntry={onAddEntry}
      onDeleteEntries={onDeleteEntries}
      config={grid.config}
    />
  )
}
