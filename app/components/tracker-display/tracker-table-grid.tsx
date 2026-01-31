import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerOptionTable,
} from './types'
import { TrackerCell } from './tracker-cell'
// import { resolveOptions } from './resolve-options' // Updated import name if needed, assuming resolveFieldOptions was renamed or I should rewrite it

// Helper to look up options from optionTables
function resolveFieldOptions(
  field: { id: string; dataType: string },
  optionTables: TrackerOptionTable[],
  optionsMappingId?: string,
) {
  if (field.dataType !== 'options' && field.dataType !== 'multiselect')
    return undefined
  if (!optionsMappingId) return undefined

  const table = optionTables.find((t) => t.id === optionsMappingId)
  if (!table || !table.options) return undefined

  return table.options.map((opt) => ({
    ...opt,
    id: opt.id ?? String(opt.value),
  }))
}

interface TrackerTableGridProps {
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  optionTables: TrackerOptionTable[]
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
  onDeleteEntries?: (rowIndices: number[]) => void
}

export function TrackerTableGrid({
  grid,
  layoutNodes,
  fields,
  optionTables,
  gridData,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: TrackerTableGridProps) {
  // Find fields connected to this grid
  const connectedFieldNodes = layoutNodes
    .filter((n) => n.gridId === grid.id && n.refType === 'field')
    .sort((a, b) => a.order - b.order)

  if (connectedFieldNodes.length === 0) {
    if (layoutNodes.length === 0) return null
    return (
      <div className="p-4 text-muted-foreground">
        Empty Table (No Fields linked)
      </div>
    )
  }

  const tableFields = connectedFieldNodes
    .map((node) => fields.find((f) => f.id === node.refId))
    .filter((f): f is TrackerField => !!f)

  if (tableFields.length === 0)
    return <div className="p-4 text-red-500">Missing Field Definitions</div>

  // Rows come from gridData[grid.id]
  const rows = gridData?.[grid.id] ?? []

  const fieldMetadata: FieldMetadata = {}
  tableFields.forEach((field) => {
    fieldMetadata[field.id] = {
      name: field.ui.label,
      type: field.dataType,
      options: resolveFieldOptions(
        field,
        optionTables,
        field.config?.optionsMappingId,
      ),
    }
  })

  // Columns from connected fields
  const columns: ColumnDef<Record<string, unknown>>[] = tableFields.map(
    (field) => ({
      id: field.id,
      accessorKey: field.id,
      header: field.ui.label,
      cell: ({ row }) => {
        const value = row.getValue(field.id)
        return (
          <TrackerCell
            value={value}
            type={field.dataType}
            options={resolveFieldOptions(
              field,
              optionTables,
              field.config?.optionsMappingId,
            )}
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
