'use client'

import { useState } from 'react'
import {
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from './types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { GridViewContent } from './GridViewContent'
import { normalizeGridViews } from './view-utils'

export interface TrackerSectionProps {
  tabId: string
  section: ITrackerSection
  grids: TrackerGrid[]
  allGrids?: TrackerGrid[]
  allFields?: TrackerField[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings?: TrackerBindings
  styles?: Record<string, StyleOverrides>
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (
    gridId: string,
    rowIndex: number,
    columnId: string,
    value: unknown,
  ) => void
  onAddEntry?: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries?: (gridId: string, rowIndices: number[]) => void
}

export function TrackerSection({
  tabId,
  section,
  grids,
  allGrids,
  allFields,
  fields,
  layoutNodes,
  bindings = {},
  styles,
  dependsOn,
  gridData,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: TrackerSectionProps) {
  const [collapsed, setCollapsed] = useState(section.config?.isCollapsedByDefault ?? false)
  const gridNames = grids.map((g) => g.name)

  return (
    <div className="space-y-4">
      {collapsed ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCollapsed(false)}
          onKeyDown={(e) => e.key === 'Enter' && setCollapsed(false)}
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 py-2 px-3 rounded-md bg-muted/60 text-muted-foreground text-sm border border-border/60 cursor-pointer hover:bg-muted transition-colors"
          aria-label="Expand section"
        >
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">{section.name}</span>
          <span className="text-muted-foreground">—</span>
          <span>{gridNames.join(', ')}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <h3 className="text-2xl font-semibold text-foreground shrink-0">
              {section.name}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse section"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-6">
            {grids.map((grid) => {
              const gridLayoutNodes = layoutNodes
                .filter((node) => node.gridId === grid.id)
                .sort((a, b) => a.order - b.order)
              const views = normalizeGridViews(grid)

              if (views.length === 1) {
                const viewOverrides =
                  (views[0].id && styles?.[views[0].id]) || styles?.[grid.id] || undefined
                return (
                  <div key={grid.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {grid.name}
                      </label>
                    </div>
                    <GridViewContent
                      tabId={tabId}
                      grid={grid}
                      view={views[0]}
                      gridLayoutNodes={gridLayoutNodes}
                      allLayoutNodes={layoutNodes}
                      fields={fields}
                      allGrids={allGrids}
                      allFields={allFields}
                      bindings={bindings}
                      styleOverrides={viewOverrides}
                      dependsOn={dependsOn}
                      gridData={gridData}
                      onUpdate={onUpdate}
                      onAddEntry={onAddEntry}
                      onDeleteEntries={onDeleteEntries}
                    />
                  </div>
                )
              }

              const defaultTab = views[0]?.id ?? `${grid.id}_view_0`
              return (
                <div key={grid.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {grid.name}
                    </label>
                  </div>
                  <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
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
                        <TabsContent key={view.id} value={view.id} className="mt-3">
                          <GridViewContent
                            tabId={tabId}
                            grid={grid}
                            view={view}
                            gridLayoutNodes={gridLayoutNodes}
                            allLayoutNodes={layoutNodes}
                            fields={fields}
                            allGrids={allGrids}
                            allFields={allFields}
                            bindings={bindings}
                            styleOverrides={viewOverrides}
                            dependsOn={dependsOn}
                            gridData={gridData}
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
            })}
          </div>
        </>
      )}
    </div>
  )
}
