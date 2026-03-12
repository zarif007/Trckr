import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getInitialGridDataFromBindings } from '@/lib/resolve-bindings'
import {
  applyCompiledCalculationsForRow,
  buildAccumulateDepsBySourceGrid,
  compileCalculationsForGrid,
} from '@/lib/field-calculation'
import type { FieldCalculationRule } from '@/lib/functions/types'
import type { TrackerBindings } from '@/lib/types/tracker-bindings'

interface GridDataEngineInput {
  bindings: TrackerBindings | undefined
  initialGridData: Record<string, Array<Record<string, unknown>>> | undefined
  calculations: Record<string, FieldCalculationRule> | undefined
  gridIds: string[]
}

interface GridDataEngineOutput {
  gridData: Record<string, Array<Record<string, unknown>>>
  gridDataRef: React.MutableRefObject<Record<string, Array<Record<string, unknown>>>>
  editVersion: number
  handleUpdate: (gridId: string, rowIndex: number, columnId: string, value: unknown) => void
  handleAddEntry: (gridId: string, newRow: Record<string, unknown>) => void
  handleDeleteEntries: (gridId: string, rowIndices: number[]) => void
}

export function useGridDataEngine({
  bindings,
  initialGridData,
  calculations,
  gridIds,
}: GridDataEngineInput): GridDataEngineOutput {
  const seedGridData = useMemo(() => {
    const fromBindings = getInitialGridDataFromBindings(bindings ?? {})
    const fromInitial = initialGridData ?? {}
    const merged: Record<string, Array<Record<string, unknown>>> = {}
    const allGridIds = new Set([...Object.keys(fromBindings), ...Object.keys(fromInitial)])

    for (const gridId of allGridIds) {
      const initialRows = fromInitial[gridId]
      const bindingRows = fromBindings[gridId]
      if (initialRows?.length) {
        merged[gridId] = initialRows
      } else if (Array.isArray(bindingRows)) {
        merged[gridId] = bindingRows
      } else {
        merged[gridId] = []
      }
    }

    return merged
  }, [bindings, initialGridData])

  const [localGridData, setLocalGridData] = useState<Record<string, Array<Record<string, unknown>>>>(
    () => ({})
  )
  const [editVersion, setEditVersion] = useState(0)

  const baseGridData = seedGridData

  const gridData = useMemo(() => {
    const merged = { ...baseGridData }
    for (const [gridId, rows] of Object.entries(localGridData)) {
      if (Array.isArray(rows)) merged[gridId] = rows
    }
    return merged
  }, [baseGridData, localGridData])

  const gridDataRef = useRef<Record<string, Array<Record<string, unknown>>>>(gridData)
  useEffect(() => {
    gridDataRef.current = gridData
  }, [gridData])

  const compiledCalculationsByGrid = useMemo(() => {
    const plans = new Map<string, ReturnType<typeof compileCalculationsForGrid>>()
    if (!calculations || Object.keys(calculations).length === 0) return plans

    for (const gridId of gridIds) {
      plans.set(gridId, compileCalculationsForGrid(gridId, calculations))
    }
    return plans
  }, [calculations, gridIds])

  const accumulateDepsBySourceGrid = useMemo(
    () => buildAccumulateDepsBySourceGrid(calculations ?? undefined),
    [calculations]
  )

  const handleUpdate = useCallback(
    (gridId: string, rowIndex: number, columnId: string, value: unknown) => {
      setEditVersion((v) => v + 1)
      const calculationKey = `${gridId}.${columnId}`
      const isCalculatedField = !!calculations?.[calculationKey]

      setLocalGridData((prev) => {
        const result: Record<string, Array<Record<string, unknown>>> = { ...(prev ?? {}) }
        const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
        const next = [...current]
        while (next.length <= rowIndex) next.push({})

        const row = { ...next[rowIndex], [columnId]: value }
        const plan = compiledCalculationsByGrid.get(gridId)
        next[rowIndex] = row
        result[gridId] = next
        const gridDataForCalc = result

        const calculatedRow = plan
          ? applyCompiledCalculationsForRow({
            plan,
            row,
            changedFieldIds: [columnId],
            gridData: gridDataForCalc,
          }).row
          : row

        next[rowIndex] = isCalculatedField ? { ...calculatedRow, [columnId]: value } : calculatedRow
        result[gridId] = next

        const dependentGridIds = accumulateDepsBySourceGrid.get(gridId)
        if (dependentGridIds?.length) {
          for (const depGridId of dependentGridIds) {
            if (depGridId === gridId) continue
            const depPlan = compiledCalculationsByGrid.get(depGridId)
            if (!depPlan) continue
            const depRows = result[depGridId] ?? prev?.[depGridId] ?? baseGridData[depGridId] ?? []
            const rowsToRecalc = depRows.length > 0 ? depRows : [{}]
            result[depGridId] = rowsToRecalc.map((r) =>
              applyCompiledCalculationsForRow({
                plan: depPlan,
                row: r,
                gridData: gridDataForCalc,
              }).row
            )
          }
        }

        return result
      })
    },
    [baseGridData, calculations, accumulateDepsBySourceGrid, compiledCalculationsByGrid]
  )

  const handleAddEntry = useCallback(
    (gridId: string, newRow: Record<string, unknown>) => {
      setEditVersion((v) => v + 1)
      setLocalGridData((prev) => {
        const result: Record<string, Array<Record<string, unknown>>> = { ...(prev ?? {}) }
        const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
        const newRows = [...current, newRow]
        result[gridId] = newRows
        const gridDataForCalc = result
        const plan = compiledCalculationsByGrid.get(gridId)
        const calculatedRow = plan
          ? applyCompiledCalculationsForRow({
            plan,
            row: newRow,
            changedFieldIds: Object.keys(newRow),
            gridData: gridDataForCalc,
          }).row
          : newRow
        result[gridId] = [...current, calculatedRow]

        const dependentGridIds = accumulateDepsBySourceGrid.get(gridId)
        if (dependentGridIds?.length) {
          for (const depGridId of dependentGridIds) {
            if (depGridId === gridId) continue
            const depPlan = compiledCalculationsByGrid.get(depGridId)
            if (!depPlan) continue
            const depRows = result[depGridId] ?? prev?.[depGridId] ?? baseGridData[depGridId] ?? []
            const rowsToRecalc = depRows.length > 0 ? depRows : [{}]
            result[depGridId] = rowsToRecalc.map((r) =>
              applyCompiledCalculationsForRow({
                plan: depPlan,
                row: r,
                gridData: gridDataForCalc,
              }).row
            )
          }
        }

        return result
      })
    },
    [baseGridData, accumulateDepsBySourceGrid, compiledCalculationsByGrid]
  )

  const handleDeleteEntries = useCallback(
    (gridId: string, rowIndices: number[]) => {
      setEditVersion((v) => v + 1)
      setLocalGridData((prev) => {
        const result: Record<string, Array<Record<string, unknown>>> = { ...(prev ?? {}) }
        const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
        result[gridId] = current.filter((_, index) => !rowIndices.includes(index))
        const gridDataForCalc = result

        const dependentGridIds = accumulateDepsBySourceGrid.get(gridId)
        if (dependentGridIds?.length) {
          for (const depGridId of dependentGridIds) {
            if (depGridId === gridId) continue
            const depPlan = compiledCalculationsByGrid.get(depGridId)
            if (!depPlan) continue
            const depRows = result[depGridId] ?? prev?.[depGridId] ?? baseGridData[depGridId] ?? []
            const rowsToRecalc = depRows.length > 0 ? depRows : [{}]
            result[depGridId] = rowsToRecalc.map((r) =>
              applyCompiledCalculationsForRow({
                plan: depPlan,
                row: r,
                gridData: gridDataForCalc,
              }).row
            )
          }
        }

        return result
      })
    },
    [baseGridData, accumulateDepsBySourceGrid, compiledCalculationsByGrid]
  )

  return {
    gridData,
    gridDataRef,
    editVersion,
    handleUpdate,
    handleAddEntry,
    handleDeleteEntries,
  }
}
