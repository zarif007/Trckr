import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
} from './types'
import { TrackerCell } from './TrackerCell'
import { resolveFieldOptionsV2 } from '@/lib/resolve-options'
import { getBindingForField, findOptionRow, applyBindings, parsePath, getValueFieldIdFromBinding } from '@/lib/resolve-bindings'
import type { OptionsGridFieldDef } from '@/components/ui/data-table/utils'

interface TrackerTableGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  /** All layout nodes (all grids). Used to resolve options grid fields for Add Option. */
  allLayoutNodes?: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
  /** Add a row to any grid (e.g. options grid). Used for "Add option" in select/multiselect. */
  onAddEntryToGrid?: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries?: (rowIndices: number[]) => void
  onCrossGridUpdate?: (gridId: string, rowIndex: number, fieldId: string, value: unknown) => void
}

export function TrackerTableGrid({
  tabId,
  grid,
  layoutNodes,
  allLayoutNodes,
  fields,
  bindings = {},
  gridData = {},
  onUpdate,
  onAddEntry,
  onAddEntryToGrid,
  onDeleteEntries,
  onCrossGridUpdate,
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
    const binding = (field.dataType === 'options' || field.dataType === 'multiselect')
      ? getBindingForField(grid.id, field.id, bindings, tabId)
      : undefined
    const selectFieldPath = `${grid.id}.${field.id}`
    let optionsGridFields: OptionsGridFieldDef[] | undefined
    let onAddOption: ((row: Record<string, unknown>) => string) | undefined
    if (binding && onAddEntryToGrid) {
      const optionsGridId = binding.optionsGrid?.includes('.') ? binding.optionsGrid.split('.').pop()! : binding.optionsGrid
      const valueFieldId = getValueFieldIdFromBinding(binding, selectFieldPath)
      const { fieldId: labelFieldId } = parsePath(binding.labelField)
      const allNodes = allLayoutNodes ?? layoutNodes
      const optionLayoutNodes = allNodes.filter((n) => n.gridId === (optionsGridId ?? '')).sort((a, b) => a.order - b.order)
      optionsGridFields = optionLayoutNodes
        .map((n) => fields.find((f) => f.id === n.fieldId))
        .filter((f): f is NonNullable<typeof f> => !!f && !f.config?.isHidden)
        .map((f) => ({
          id: f.id,
          label: f.ui.label,
          type: f.dataType as FieldMetadata[string]['type'],
          config: f.config as FieldMetadata[string]['config'],
        }))
      onAddOption = (row: Record<string, unknown>) => {
        onAddEntryToGrid!(optionsGridId!, row)
        const val = row[valueFieldId ?? '']
        const label = labelFieldId ? row[labelFieldId] : undefined
        return String(val ?? label ?? '')
      }
    }
    const getBindingUpdatesFromRow =
      binding && onAddEntryToGrid
        ? (row: Record<string, unknown>) => {
          const b = getBindingForField(grid.id, field.id, bindings, tabId)
          if (!b?.fieldMappings?.length) return {}
          const selectFieldPath = `${grid.id}.${field.id}`
          const updates = applyBindings(b, row, selectFieldPath)
          const result: Record<string, unknown> = {}
          for (const u of updates) {
            const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(u.targetPath)
            if (targetGridId === grid.id && targetFieldId) result[targetFieldId] = u.value
          }
          return result
        }
        : undefined
    fieldMetadata[field.id] = {
      name: field.ui.label,
      type: field.dataType,
      options: opts?.map((o) => ({ id: o.id ?? String(o.value ?? ''), label: o.label ?? '' })),
      config: field.config,
      optionsGridFields,
      onAddOption,
      getBindingUpdatesFromRow,
    }
  })

  const handleCellUpdate = (rowIndex: number, columnId: string, value: unknown) => {
    if (!onUpdate) return

    onUpdate(rowIndex, columnId, value)

    const field = tableFields.find((f) => f.id === columnId)
    if (field && (field.dataType === 'options' || field.dataType === 'multiselect')) {
      const binding = getBindingForField(grid.id, columnId, bindings, tabId)
      if (binding && binding.fieldMappings.length > 0) {
        const selectFieldPath = `${grid.id}.${columnId}`
        const optionRow = findOptionRow(gridData, binding, value, selectFieldPath)
        if (optionRow) {
          const updates = applyBindings(binding, optionRow, selectFieldPath)
          for (const update of updates) {
            const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(update.targetPath)
            if (targetGridId && targetFieldId) {
              if (onCrossGridUpdate) {
                onCrossGridUpdate(targetGridId, rowIndex, targetFieldId, update.value)
              } else if (targetGridId === grid.id) {
                onUpdate(rowIndex, targetFieldId, update.value)
              }
            }
          }
        }
      }
    }
  }

  /** For Add Entry dialog: when a select/multiselect changes, return binding updates to merge into form. */
  const getBindingUpdates = (fieldId: string, value: unknown): Record<string, unknown> => {
    const binding = getBindingForField(grid.id, fieldId, bindings, tabId)
    if (!binding?.fieldMappings?.length) return {}
    const selectFieldPath = `${grid.id}.${fieldId}`
    const optionRow = findOptionRow(gridData, binding, value, selectFieldPath)
    if (!optionRow) return {}
    const updates = applyBindings(binding, optionRow, selectFieldPath)
    const result: Record<string, unknown> = {}
    for (const u of updates) {
      const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(u.targetPath)
      if (targetGridId === grid.id && targetFieldId) result[targetFieldId] = u.value
    }
    return result
  }

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
      getBindingUpdates={getBindingUpdates}
      config={grid.config}
    />
  );
}
