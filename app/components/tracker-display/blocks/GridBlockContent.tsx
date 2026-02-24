'use client'

import { useMemo, type RefObject } from 'react'
import type {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
  GridDataRecord,
} from '../types'
import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GridViewContent } from '../GridViewContent'
import { normalizeGridViews } from '../view-utils'

export interface GridBlockContentProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  allLayoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  allGrids?: TrackerGrid[]
  allFields?: TrackerField[]
  bindings: TrackerBindings
  validations?: Record<string, FieldValidationRule[]>
  calculations?: Record<string, FieldCalculationRule>
  styles?: Record<string, StyleOverrides>
  dependsOn?: DependsOnRules
  gridData?: GridDataRecord
  gridDataRef?: RefObject<GridDataRecord> | null
  onUpdate?: (gridId: string, rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries?: (gridId: string, rowIndices: number[]) => void
  /** When true, hide the grid name label (e.g. in BlockEditor where it is shown by the block wrapper). */
  hideLabel?: boolean
}

/**
 * Renders a single grid: resolves views, shows view tabs if multiple views,
 * and delegates to GridViewContent for the actual grid rendering.
 *
 * Shared between TrackerSection (display mode) and BlockEditor (edit mode).
 */
export function GridBlockContent({
  tabId,
  grid,
  layoutNodes,
  allLayoutNodes,
  fields,
  allGrids,
  allFields,
  bindings,
  validations,
  calculations,
  styles,
  dependsOn,
  gridData,
  gridDataRef,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
  hideLabel = false,
}: GridBlockContentProps) {
  const gridLayoutNodes = useMemo(
    () =>
      layoutNodes
        .filter((node) => node.gridId === grid.id)
        .sort((a, b) => a.order - b.order),
    [layoutNodes, grid.id]
  )
  const views = useMemo(() => normalizeGridViews(grid), [grid])

  if (views.length === 1) {
    const viewOverrides =
      (views[0].id && styles?.[views[0].id]) || styles?.[grid.id] || undefined
    return (
      <div className="w-full min-w-0 space-y-2.5">
        {!hideLabel && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {grid.name}
            </label>
          </div>
        )}
        <GridViewContent
          tabId={tabId}
          grid={grid}
          view={views[0]}
          gridLayoutNodes={gridLayoutNodes}
          allLayoutNodes={allLayoutNodes}
          fields={fields}
          allGrids={allGrids}
          allFields={allFields}
          bindings={bindings}
          validations={validations}
          calculations={calculations}
          styleOverrides={viewOverrides}
          dependsOn={dependsOn}
          gridData={gridData}
          gridDataRef={gridDataRef}
          gridDataForThisGrid={gridData?.[grid.id] ?? []}
          onUpdate={onUpdate}
          onAddEntry={onAddEntry}
          onDeleteEntries={onDeleteEntries}
        />
      </div>
    )
  }

  const defaultTab = views[0]?.id ?? `${grid.id}_view_0`
  return (
    <div className="w-full min-w-0 space-y-2.5">
      {!hideLabel && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {grid.name}
          </label>
        </div>
      )}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          {views.map((view) => (
            <TabsTrigger key={view.id} value={view.id}>
              {view.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {views.map((view) => {
          const viewOverrides =
            (view.id && styles?.[view.id]) || styles?.[grid.id] || undefined
          return (
            <TabsContent key={view.id} value={view.id} className="mt-2.5">
              <GridViewContent
                tabId={tabId}
                grid={grid}
                view={view}
                gridLayoutNodes={gridLayoutNodes}
                allLayoutNodes={allLayoutNodes}
                fields={fields}
                allGrids={allGrids}
                allFields={allFields}
                bindings={bindings}
                validations={validations}
                calculations={calculations}
                styleOverrides={viewOverrides}
                dependsOn={dependsOn}
                gridData={gridData}
                gridDataRef={gridDataRef}
                gridDataForThisGrid={gridData?.[grid.id] ?? []}
                onUpdate={onUpdate}
                onAddEntry={onAddEntry}
                onDeleteEntries={onDeleteEntries}
              />
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
