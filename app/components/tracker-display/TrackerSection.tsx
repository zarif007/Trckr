import {
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
} from './types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrackerTableGrid } from './TrackerTableGrid'
import { TrackerKanbanGrid } from './TrackerKanbanGrid'
import { TrackerDivGrid } from './TrackerDivGrid'

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

/** Renders one grid view (primary or shadow) using grid.id for data; type/config from grid or view. */
function GridViewContent({
  tabId,
  grid,
  gridLike,
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
  gridLike: Pick<TrackerGrid, 'id' | 'name' | 'type' | 'config'>
  gridLayoutNodes: TrackerLayoutNode[]
  /** All layout nodes (all grids). Used to resolve options grid fields for Add Option. */
  allLayoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings: TrackerBindings
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (gridId: string, rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry?: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries?: (gridId: string, rowIndices: number[]) => void
}) {
  const gridId = grid.id
  const g = { ...grid, type: gridLike.type, config: gridLike.config ?? {} }

  if (gridLike.type === 'table') {
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
  if (gridLike.type === 'kanban') {
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
  if (gridLike.type === 'div') {
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
  if (gridLike.type === 'calendar') {
    return (
      <div className="p-4 border border-dashed rounded text-muted-foreground">
        Calendar Grid: {grid.name} (Not implemented)
      </div>
    )
  }
  if (gridLike.type === 'timeline') {
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

          const hasViews = Array.isArray(grid.views) && grid.views.length > 0

          if (!hasViews) {
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
                  gridLike={{ id: grid.id, name: grid.name, type: grid.type, config: grid.config }}
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

          const primaryLabel = grid.type === 'table' ? 'Table' : grid.type === 'kanban' ? 'Kanban' : grid.type === 'div' ? 'Form' : grid.type
          const defaultTab = 'primary'

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
                  <TabsTrigger value="primary">{primaryLabel}</TabsTrigger>
                  {grid.views!.map((view) => (
                    <TabsTrigger key={view.id} value={view.id}>
                      {view.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="primary" className="mt-3">
                  <GridViewContent
                    tabId={tabId}
                    grid={grid}
                    gridLike={{ id: grid.id, name: grid.name, type: grid.type, config: grid.config }}
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
                {grid.views!.map((view) => (
                  <TabsContent key={view.id} value={view.id} className="mt-3">
                    <GridViewContent
                      tabId={tabId}
                      grid={grid}
                      gridLike={{ id: grid.id, name: grid.name, type: view.type, config: view.config }}
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
