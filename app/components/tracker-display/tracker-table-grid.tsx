import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { TrackerGrid, TrackerField } from './types'
import { TrackerCell } from './tracker-cell'

interface TrackerTableGridProps {
  grid: TrackerGrid & { fields: TrackerField[] }
  examples: Array<Record<string, any>>
  onUpdate?: (rowIndex: number, columnId: string, value: any) => void
}

export function TrackerTableGrid({
  grid,
  examples,
  onUpdate,
}: TrackerTableGridProps) {
  if (examples.length === 0 || grid.fields.length === 0) return null

  const fieldMetadata: Record<string, any> = {}
  grid.fields.forEach((field) => {
    fieldMetadata[field.key] = {
      label: field.ui.label,
      type: field.dataType,
      options: field.config?.options,
    }
  })

  const columns = useMemo<ColumnDef<Record<string, any>>[]>(
    () =>
      grid.fields.map((field) => ({
        id: field.key,
        accessorKey: field.key,
        header: field.ui.label,
        cell: ({ row }) => {
          const value = row.getValue(field.key)
          return <TrackerCell value={value} type={field.dataType} options={field.config?.options} />
        },
      })),
    [grid.fields]
  )

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline">
          Add Entry
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={examples}
        fieldMetadata={fieldMetadata}
        onCellUpdate={onUpdate}
      />
    </div>
  )
}

