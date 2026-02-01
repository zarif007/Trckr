import {
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerOptionMap,
  TrackerOptionTable,
} from './types'
import { TrackerTableGrid } from './tracker-table-grid'
import { TrackerKanbanGrid } from './tracker-kanban-grid'
import { TrackerDivGrid } from './tracker-div-grid'

interface TrackerSectionProps {
  section: ITrackerSection
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  optionTables: TrackerOptionTable[]
  optionMaps?: TrackerOptionMap[]
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
  section,
  grids,
  fields,
  layoutNodes,
  optionTables,
  optionMaps = [],
  gridData,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: TrackerSectionProps) {
  // Filter grids that belong to this section
  // They are already filtered in the parent, but purely trusting props is fine too
  // if the parent passed the correct subset.
  // Based on current implementation, parent passes specific grids.
  
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-foreground border-b pb-2">
        {section.name}
      </h3>
      <div className="space-y-6">
        {grids.map((grid) => {
            // Get layout nodes for this grid
            const gridLayoutNodes = layoutNodes
                .filter(node => node.gridId === grid.id)
                .sort((a, b) => a.order - b.order)
            
            return (
                <div key={grid.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {grid.name}
                        </label>
                    </div>
                    </div>
                     {grid.type === 'table' && (
                        <TrackerTableGrid
                            grid={grid}
                            layoutNodes={gridLayoutNodes}
                            fields={fields}
                            optionTables={optionTables}
                            optionMaps={optionMaps}
                            gridData={gridData}
                            onUpdate={onUpdate ? (rowIndex, columnId, value) => onUpdate(grid.id, rowIndex, columnId, value) : undefined}
                            onAddEntry={onAddEntry ? (newRow) => onAddEntry(grid.id, newRow) : undefined}
                            onDeleteEntries={onDeleteEntries ? (rowIndices) => onDeleteEntries(grid.id, rowIndices) : undefined}
                        />
                    )}
                    {grid.type === 'kanban' && (
                         <TrackerKanbanGrid
                            grid={grid}
                            layoutNodes={gridLayoutNodes}
                            fields={fields}
                            optionTables={optionTables}
                            optionMaps={optionMaps}
                            gridData={gridData}
                            onUpdate={onUpdate ? (rowIndex, columnId, value) => onUpdate(grid.id, rowIndex, columnId, value) : undefined}
                         />
                    )}
                    {grid.type === 'div' && (
                        <TrackerDivGrid
                            grid={grid}
                            layoutNodes={gridLayoutNodes}
                            fields={fields}
                            optionTables={optionTables}
                            optionMaps={optionMaps}
                            gridData={gridData}
                            onUpdate={onUpdate ? (rowIndex, columnId, value) => onUpdate(grid.id, rowIndex, columnId, value) : undefined}
                        />
                    )}
                    {grid.type === 'calendar' && (
                         <div className="p-4 border border-dashed rounded text-muted-foreground">
                            Calendar Grid: {grid.name} (Not implemented)
                        </div>
                    )}
                     {grid.type === 'timeline' && (
                         <div className="p-4 border border-dashed rounded text-muted-foreground">
                            Timeline Grid: {grid.name} (Not implemented)
                        </div>
                    )}
                </div>
            )
        })}
      </div>
    </div>
  )
}
