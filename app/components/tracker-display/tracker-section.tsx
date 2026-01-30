import {
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
} from './types'
import { TrackerTableGrid } from './tracker-table-grid'
import { TrackerKanbanGrid } from './tracker-kanban-grid'
import { TrackerDivGrid } from './tracker-div-grid'

interface TrackerSectionProps {
  section: ITrackerSection & {
    grids: (TrackerGrid & { fields: TrackerField[] })[]
  }
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
        {section.grids.map((grid) => (
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
                rows={(() => {
                  const effectiveGridId =
                    grid.isShadow && grid.gridId ? grid.gridId : grid.id
                  const explicit = gridData?.[effectiveGridId]
                  return explicit ?? []
                })()}
                gridData={gridData}
                onUpdate={(rowIndex, columnId, value) =>
                  onUpdate?.(
                    grid.isShadow && grid.gridId ? grid.gridId : grid.id,
                    rowIndex,
                    columnId,
                    value,
                  )
                }
                onAddEntry={(newRow) =>
                  onAddEntry?.(
                    grid.isShadow && grid.gridId ? grid.gridId : grid.id,
                    newRow,
                  )
                }
                onDeleteEntries={(rowIndices) =>
                  onDeleteEntries?.(
                    grid.isShadow && grid.gridId ? grid.gridId : grid.id,
                    rowIndices,
                  )
                }
              />
            )}
            {grid.type === 'kanban' && (
              <TrackerKanbanGrid
                grid={grid}
                rows={
                  gridData?.[
                    grid.isShadow && grid.gridId ? grid.gridId : grid.id
                  ] ?? []
                }
                gridData={gridData}
                onUpdate={(rowIndex, columnId, value) =>
                  onUpdate?.(
                    grid.isShadow && grid.gridId ? grid.gridId : grid.id,
                    rowIndex,
                    columnId,
                    value,
                  )
                }
              />
            )}
            {grid.type === 'div' && (
              <TrackerDivGrid
                grid={grid}
                rows={
                  gridData?.[
                    grid.isShadow && grid.gridId ? grid.gridId : grid.id
                  ] ?? []
                }
                gridData={gridData}
                onUpdate={(rowIndex, columnId, value) =>
                  onUpdate?.(
                    grid.isShadow && grid.gridId ? grid.gridId : grid.id,
                    rowIndex,
                    columnId,
                    value,
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
