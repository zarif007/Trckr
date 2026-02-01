import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerOptionMap,
  TrackerOptionTable,
} from './types'
import { TrackerCell } from './tracker-cell'
import { resolveFieldOptions } from './resolve-options'

interface TrackerTableGridProps {
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  optionTables: TrackerOptionTable[]
  optionMaps?: TrackerOptionMap[]
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
  optionMaps = [],
  gridData = {},
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: TrackerTableGridProps) {
  const connectedFieldNodes = layoutNodes
    .filter((n) => n.gridId === grid.id)
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
    .map((node) => fields.find((f) => f.id === node.fieldId))
    .filter((f): f is TrackerField => !!f && !f.config?.isHidden)

  if (tableFields.length === 0)
    return <div className="p-4 text-red-500">Missing Field Definitions</div>

  const rows = gridData[grid.id] ?? []

  const fieldMetadata: FieldMetadata = {}
  tableFields.forEach((field) => {
    const opts = resolveFieldOptions(field, optionTables, optionMaps, gridData)
    fieldMetadata[field.id] = {
      name: field.ui.label,
      type: field.dataType,
      options: opts?.map((o) => ({ id: o.id ?? String(o.value ?? ''), label: o.label ?? '' })),
      config: field.config,
    }
  })

  // Columns from connected fields
  const columns: ColumnDef<Record<string, unknown>>[] = tableFields.map(
    (field) => ({
      id: field.id,
      accessorKey: field.id,
      header: field.ui.label,
      cell: function Cell({ row }) {
        const value = row.getValue(field.id);
        return (
          <TrackerCell
            value={value}
            type={field.dataType}
            options={resolveFieldOptions(field, optionTables, optionMaps, gridData)}
          />
        );
      },
    })
  );

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
  );
}
