'use client'

import { useMemo } from 'react'
import { resolveFieldOptionsV2 } from '@/lib/binding'
import type { TrackerGrid, TrackerField, TrackerLayoutNode, TrackerBindings } from '../../types'
import type { TrackerContextForOptions } from '@/lib/binding'
import type { FieldMetadata } from '../data-table/utils'
import type { FieldValidationRule } from '@/lib/functions/types'

const toOptionId = (o: { id?: string; value?: unknown; label?: string }) =>
  String(o.id ?? o.value ?? o.label ?? '').trim()

export interface UseKanbanGroupsParams {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings: TrackerBindings
  validations?: Record<string, FieldValidationRule[]>
  gridData: Record<string, Array<Record<string, unknown>>>
  trackerContext?: TrackerContextForOptions | null
}

export interface UseKanbanGroupsResult {
  groups: Array<{ id: string; label: string }>
  groupByFieldId: string
  cardFieldsDisplay: Array<{ id: string; dataType: import('../../types').TrackerFieldType; label: string }>
  fieldMetadata: FieldMetadata
  fieldOrder: string[]
  kanbanFields: TrackerField[]
  rows: Array<Record<string, unknown>>
}

export function useKanbanGroups({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings,
  validations,
  gridData,
  trackerContext,
}: UseKanbanGroupsParams): UseKanbanGroupsResult | null {
  const connectedFieldNodes = useMemo(
    () =>
      layoutNodes
        .filter((n) => n.gridId === grid.id)
        .sort((a, b) => a.order - b.order),
    [layoutNodes, grid.id]
  )

  const kanbanFields = useMemo(
    () =>
      connectedFieldNodes
        .map((node) => fields.find((f) => f.id === node.fieldId))
        .filter((f): f is TrackerField => !!f && !f.config?.isHidden),
    [connectedFieldNodes, fields]
  )

  const rows = gridData[grid.id] ?? []

  let groupByFieldId = grid.config?.groupBy
  if (!groupByFieldId) {
    const optionField = kanbanFields.find(
      (f) => f.dataType === 'options' || f.dataType === 'multiselect'
    )
    if (optionField) groupByFieldId = optionField.id
  }

  if (!groupByFieldId) return null

  const groupingField = kanbanFields.find((f) => f.id === groupByFieldId)
  if (!groupingField) return null

  const options = resolveFieldOptionsV2(
    tabId,
    grid.id,
    groupingField,
    bindings,
    gridData,
    trackerContext ?? undefined
  )

  const groups = useMemo(() => {
    let list: Array<{ id: string; label: string }> = []
    if (options?.length) {
      list = options.map((o) => ({ id: toOptionId(o), label: o.label ?? '' }))
    } else {
      const distinctValues = Array.from(
        new Set(rows.map((r) => String(r[groupByFieldId!] ?? '')))
      )
      list = distinctValues.filter(Boolean).map((v) => ({ id: v, label: v }))
    }
    if (list.length === 0) list = [{ id: '', label: 'Uncategorized' }]
    if (!list.some((g) => g.id === '')) {
      list = [...list, { id: '', label: 'Uncategorized' }]
    }
    const seen = new Set<string>()
    return list.filter((g) => {
      if (seen.has(g.id)) return false
      seen.add(g.id)
      return true
    })
  }, [options, rows, groupByFieldId])

  const cardFieldsDisplay = useMemo(
    () =>
      kanbanFields
        .filter((f) => f.id !== groupByFieldId)
        .map((f) => ({ id: f.id, dataType: f.dataType, label: f.ui.label })),
    [kanbanFields, groupByFieldId]
  )

  const fieldMetadata: FieldMetadata = useMemo(() => {
    const meta: FieldMetadata = {}
    kanbanFields.forEach((field) => {
      const opts = resolveFieldOptionsV2(
        tabId,
        grid.id,
        field,
        bindings,
        gridData,
        trackerContext ?? undefined
      )
      meta[field.id] = {
        name: field.ui.label,
        type: field.dataType,
        options: opts?.map((o) => ({ id: toOptionId(o), label: o.label ?? '' })),
        config: field.config,
        validations: validations?.[`${grid.id}.${field.id}`] ?? validations?.[field.id],
      }
    })
    return meta
  }, [tabId, grid.id, kanbanFields, bindings, gridData, trackerContext, validations])

  const fieldOrder = kanbanFields.map((f) => f.id)

  return {
    groups,
    groupByFieldId,
    cardFieldsDisplay,
    fieldMetadata,
    fieldOrder,
    kanbanFields,
    rows,
  }
}
