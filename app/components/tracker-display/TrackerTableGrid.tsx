import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { FieldMetadata } from '@/components/ui/data-table/utils'
import type { TrackerContextForOptions } from '@/lib/resolve-options'
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from './types'
import { TrackerCell } from './TrackerCell'
import { resolveFieldOptionsV2 } from '@/lib/resolve-options'
import { getBindingForField, findOptionRow, applyBindings, parsePath, getValueFieldIdFromBinding } from '@/lib/resolve-bindings'
import type { OptionsGridFieldDef } from '@/components/ui/data-table/utils'
import { buildDependsOnIndex, getRulesForGrid, resolveDependsOnOverrides } from '@/lib/depends-on'
import { useMemo, useCallback } from 'react'

interface TrackerTableGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  /** All layout nodes (all grids). Used to resolve options grid fields for Add Option. */
  allLayoutNodes?: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  /** Optional style overrides for this table view. */
  styleOverrides?: StyleOverrides
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (newRow: Record<string, unknown>) => void
  /** Add a row to any grid (e.g. options grid). Used for "Add option" in select/multiselect. */
  onAddEntryToGrid?: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries?: (rowIndices: number[]) => void
  onCrossGridUpdate?: (gridId: string, rowIndex: number, fieldId: string, value: unknown) => void
  /** For dynamic_select/dynamic_multiselect option resolution (e.g. all_field_paths). */
  trackerContext?: TrackerContextForOptions
}

export function TrackerTableGrid({
  tabId,
  grid,
  layoutNodes,
  allLayoutNodes,
  fields,
  bindings = {},
  styleOverrides,
  dependsOn,
  gridData = {},
  onUpdate,
  onAddEntry,
  onAddEntryToGrid,
  onDeleteEntries,
  onCrossGridUpdate,
  trackerContext,
}: TrackerTableGridProps) {
  const dependsOnIndex = useMemo(() => buildDependsOnIndex(dependsOn ?? []), [dependsOn])
  const dependsOnForGrid = useMemo(
    () => getRulesForGrid(dependsOnIndex, grid.id),
    [dependsOnIndex, grid.id]
  )
  const connectedFieldNodes = layoutNodes
    .filter((n) => n.gridId === grid.id)
    .sort((a, b) => a.order - b.order)
  const tableFields = connectedFieldNodes
    .map((node) => fields.find((f) => f.id === node.fieldId))
    .filter((f): f is TrackerField => !!f && !f.config?.isHidden)
  const rows = gridData[grid.id] ?? []

  /** Per-row override cache: compute once per row, reuse for all cells and hiddenColumnIds. */
  const rowOverridesCache = useMemo(() => {
    const out: Record<number, Record<string, import('@/lib/depends-on').FieldOverride>> = {}
    const rowsToCompute = rows.length > 0 ? rows : [{} as Record<string, unknown>]
    rowsToCompute.forEach((row, idx) => {
      out[idx] = resolveDependsOnOverrides(dependsOnForGrid, gridData, grid.id, idx, row)
    })
    return out
  }, [dependsOnForGrid, gridData, grid.id])

  const hiddenTargetFields = useMemo(() => {
    const targets = new Set<string>()
    dependsOnForGrid.forEach((rule) => {
      if (!rule?.targets || !rule.action) return
      const action = String(rule.action).toLowerCase()
      if (!action.includes('hidden')) return
      rule.targets.forEach((target) => {
        const { gridId, fieldId } = parsePath(target)
        if (gridId === grid.id && fieldId) targets.add(fieldId)
      })
    })
    return targets
  }, [dependsOnForGrid, grid.id])

  const hiddenColumnIds = useMemo(() => {
    const hidden = new Set<string>()
    if (hiddenTargetFields.size === 0) return hidden
    hiddenTargetFields.forEach((fieldId) => {
      let anyVisible = false
      Object.keys(rowOverridesCache).forEach((k) => {
        const idx = Number(k)
        const overrides = rowOverridesCache[idx]
        if (overrides?.[fieldId]?.isHidden !== true) anyVisible = true
      })
      if (!anyVisible) hidden.add(fieldId)
    })
    return hidden
  }, [hiddenTargetFields, rowOverridesCache])

  const getFieldOverrides = useCallback(
    (rowIndex: number, fieldId: string) => rowOverridesCache[rowIndex]?.[fieldId],
    [rowOverridesCache]
  )
  const getFieldOverridesForRow = useCallback(
    (rowIndex: number, rowData: Record<string, unknown>, fieldId: string) =>
      resolveDependsOnOverrides(dependsOnForGrid, gridData, grid.id, rowIndex, rowData)[fieldId],
    [dependsOnForGrid, gridData, grid.id]
  )
  const getFieldOverridesForValues = useCallback(
    (values: Record<string, unknown>, rowIndex: number) =>
      resolveDependsOnOverrides(dependsOnForGrid, gridData, grid.id, rowIndex, values),
    [dependsOnForGrid, gridData, grid.id]
  )

  /** For Add Entry form: resolve overrides using only the form values, not row 0 data. */
  const getFieldOverridesForAdd = useCallback(
    (values: Record<string, unknown>, fieldId: string) =>
      resolveDependsOnOverrides(dependsOnForGrid, gridData, grid.id, 0, values, {
        onlyUseRowDataForSource: true,
      })[fieldId],
    [dependsOnForGrid, gridData, grid.id]
  )

  if (connectedFieldNodes.length === 0) {
    if (layoutNodes.length === 0) return null
    return (
      <div className="p-4 text-muted-foreground">
        Empty Table (No Fields linked)
      </div>
    )
  }
  if (tableFields.length === 0)
    return <div className="p-4 text-red-500">Missing Field Definitions</div>

  const fieldMetadata: FieldMetadata = {}
  tableFields.forEach((field) => {
    const opts = resolveFieldOptionsV2(tabId, grid.id, field, bindings, gridData, trackerContext)
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
            options={resolveFieldOptionsV2(tabId, grid.id, field, bindings, gridData, trackerContext)}
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
      getFieldOverrides={getFieldOverrides}
      getFieldOverridesForRow={getFieldOverridesForRow}
      hiddenColumns={[...hiddenColumnIds]}
      getFieldOverridesForAdd={getFieldOverridesForAdd}
      onCellUpdate={handleCellUpdate}
      onAddEntry={onAddEntry}
      onDeleteEntries={onDeleteEntries}
      getBindingUpdates={getBindingUpdates}
      config={grid.config}
      styleOverrides={styleOverrides}
      addable={(grid.config?.isRowAddAble ?? grid.config?.addable ?? true) !== false}
      editable={grid.config?.isRowEditAble !== false}
      deleteable={grid.config?.isRowDeleteAble !== false}
      editLayoutAble={grid.config?.isEditAble !== false}
    />
  );
}
