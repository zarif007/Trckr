import {
  TrackerSection as ITrackerSection,
  TrackerGrid,
  GridType,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
} from './types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrackerTableGrid } from './TrackerTableGrid'
import { TrackerKanbanGrid } from './TrackerKanbanGrid'
import { TrackerDivGrid } from './TrackerDivGrid'

const viewLabelForType = (type: GridType) => {
  if (type === 'div') return 'Form'
  if (type === 'table') return 'Table'
  if (type === 'kanban') return 'Kanban'
  if (type === 'calendar') return 'Calendar'
  if (type === 'timeline') return 'Timeline'
  return 'View'
}

const normalizeViews = (grid: TrackerGrid) => {
  const rawViews = Array.isArray(grid.views) ? grid.views : []
  const fallbackViews =
    rawViews.length > 0
      ? rawViews
      : grid.type
        ? [{ type: grid.type, config: grid.config }]
        : [{ type: 'table' as const, config: grid.config }]

  return fallbackViews.map((view, index) => {
    const type = view.type ?? 'table'
    const name = view.name ?? viewLabelForType(type)
    const id = view.id ?? `${grid.id}_${type}_view_${index}`
    return {
      ...view,
      type,
      name,
      id,
      config: view.config ?? {},
    }
  })
}

interface TrackerSectionProps {
  tabId: string
  section: ITrackerSection
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings?: TrackerBindings
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

/** Renders one grid view using grid.id for data; type/config from the view. */
function GridViewContent({
  tabId,
  grid,
  view,
  gridLayoutNodes,
  allLayoutNodes,
  fields,
  bindings,
  gridData,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: {
  tabId: string
  grid: TrackerGrid
  view: { type: GridType; config?: TrackerGrid['config'] }
  gridLayoutNodes: TrackerLayoutNode[]
  allLayoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings: TrackerBindings
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (gridId: string, rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries?: (gridId: string, rowIndices: number[]) => void
}) {
  const gridId = grid.id
  const g = { ...grid, config: view.config ?? {} }

  if (view.type === 'table') {
    return (
      <TrackerTableGrid
        tabId={tabId}
        grid={g}
        layoutNodes={gridLayoutNodes}
        allLayoutNodes={allLayoutNodes}
        fields={fields}
        bindings={bindings}
        gridData={gridData}
        onUpdate={onUpdate ? (rowIndex, columnId, value) => onUpdate(gridId, rowIndex, columnId, value) : undefined}
        onCrossGridUpdate={onUpdate}
        onAddEntry={onAddEntry ? (newRow) => onAddEntry(gridId, newRow) : undefined}
        onAddEntryToGrid={onAddEntry}
        onDeleteEntries={onDeleteEntries ? (rowIndices) => onDeleteEntries(gridId, rowIndices) : undefined}
      />
    )
  }
  if (view.type === 'kanban') {
    return (
      <TrackerKanbanGrid
        tabId={tabId}
        grid={g}
        layoutNodes={gridLayoutNodes}
        fields={fields}
        bindings={bindings}
        gridData={gridData}
        onUpdate={onUpdate ? (rowIndex, columnId, value) => onUpdate(gridId, rowIndex, columnId, value) : undefined}
        onCrossGridUpdate={onUpdate}
        onAddEntry={onAddEntry ? (newRow) => onAddEntry(gridId, newRow) : undefined}
      />
    )
  }
  if (view.type === 'div') {
    return (
      <TrackerDivGrid
        tabId={tabId}
        grid={g}
        layoutNodes={gridLayoutNodes}
        allLayoutNodes={allLayoutNodes}
        fields={fields}
        bindings={bindings}
        gridData={gridData}
        onUpdate={onUpdate ? (rowIndex, columnId, value) => onUpdate(gridId, rowIndex, columnId, value) : undefined}
        onCrossGridUpdate={onUpdate}
        onAddEntryToGrid={onAddEntry}
      />
    )
  }
  if (view.type === 'calendar') {
    return (
      <div className="p-4 border border-dashed rounded text-muted-foreground">
        Calendar Grid: {grid.name} (Not implemented)
      </div>
    )
  }
  if (view.type === 'timeline') {
    return (
      <div className="p-4 border border-dashed rounded text-muted-foreground">
        Timeline Grid: {grid.name} (Not implemented)
      </div>
    )
  }
  return null
}

export function TrackerSection({
  tabId,
  section,
  grids,
  fields,
  layoutNodes,
  bindings = {},
  gridData,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: TrackerSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-foreground border-b pb-2">
        {section.name}
      </h3>
      <div className="space-y-6">
        {grids.map((grid) => {
          const gridLayoutNodes = layoutNodes
            .filter(node => node.gridId === grid.id)
            .sort((a, b) => a.order - b.order)

          const views = normalizeViews(grid)

          if (views.length === 1) {
            return (
              <div key={grid.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {grid.name}
                    </label>
                  </div>
                </div>
                <GridViewContent
                  tabId={tabId}
                  grid={grid}
                  view={views[0]}
                  gridLayoutNodes={gridLayoutNodes}
                  allLayoutNodes={layoutNodes}
                  fields={fields}
                  bindings={bindings}
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
                <div>
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {grid.name}
                  </label>
                </div>
              </div>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                  {views.map((view) => (
                    <TabsTrigger key={view.id} value={view.id}>
                      {view.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {views.map((view) => (
                  <TabsContent key={view.id} value={view.id} className="mt-3">
                    <GridViewContent
                      tabId={tabId}
                      grid={grid}
                      view={view}
                      gridLayoutNodes={gridLayoutNodes}
                      allLayoutNodes={layoutNodes}
                      fields={fields}
                      bindings={bindings}
                      gridData={gridData}
                      onUpdate={onUpdate}
                      onAddEntry={onAddEntry}
                      onDeleteEntries={onDeleteEntries}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )
        })}
      </div>
    </div>
  )
}
