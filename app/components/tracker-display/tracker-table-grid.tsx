import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
} from './types'
import { TrackerCell } from './tracker-cell'
import { resolveFieldOptionsV2 } from './resolve-options'
import { getBindingForField, findOptionRow, applyBindings, parsePath } from '@/lib/resolve-bindings'

interface TrackerTableGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
  onDeleteEntries?: (rowIndices: number[]) => void
}

export function TrackerTableGrid({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings = {},
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
    const opts = resolveFieldOptionsV2(tabId, grid.id, field, bindings, gridData)
    fieldMetadata[field.id] = {
      name: field.ui.label,
      type: field.dataType,
      options: opts?.map((o) => ({ id: o.id ?? String(o.value ?? ''), label: o.label ?? '' })),
      config: field.config,
    }
  })

  // Handle cell update with binding support
  const handleCellUpdate = (rowIndex: number, columnId: string, value: unknown) => {
    if (!onUpdate) return

    // First, update the primary field value
    onUpdate(rowIndex, columnId, value)

    // Check if this field has bindings and apply them
    const field = tableFields.find((f) => f.id === columnId)
    if (field && (field.dataType === 'options' || field.dataType === 'multiselect')) {
      const binding = getBindingForField(grid.id, columnId, bindings, tabId)
      if (binding && binding.fieldMappings.length > 0) {
        const selectFieldPath = `${grid.id}.${columnId}`
        const optionRow = findOptionRow(gridData, binding, value, selectFieldPath)
        if (optionRow) {
          const updates = applyBindings(binding, optionRow, selectFieldPath)
          for (const update of updates) {
            const { fieldId } = parsePath(update.targetPath)
            if (fieldId) {
              onUpdate(rowIndex, fieldId, update.value)
            }
          }
        }
      }
    }
  }

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
            options={resolveFieldOptionsV2(tabId, grid.id, field, bindings, gridData)}
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
      onCellUpdate={handleCellUpdate}
      onAddEntry={onAddEntry}
      onDeleteEntries={onDeleteEntries}
      config={grid.config}
    />
  );
}
