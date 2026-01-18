import { TrackerSection as ITrackerSection, TrackerGrid, TrackerField } from './types'
import { TrackerTableGrid } from './tracker-table-grid'
import { TrackerKanbanGrid } from './tracker-kanban-grid'
import { TrackerDivGrid } from './tracker-div-grid'

interface TrackerSectionProps {
  section: ITrackerSection & {
    grids: (TrackerGrid & { fields: TrackerField[] })[]
  }
  examples: Array<Record<string, any>>
  onUpdate?: (rowIndex: number, columnId: string, value: any) => void
}

export function TrackerSection({
  section,
  examples,
  onUpdate,
}: TrackerSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-foreground border-b pb-2">
        {section.name}
      </h3>
      <div className="space-y-6">
        {section.grids.map((grid) => (
          <div key={grid.fieldName} className="space-y-3">
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
                examples={examples}
                onUpdate={onUpdate}
              />
            )}
            {grid.type === 'kanban' && (
              <TrackerKanbanGrid 
                grid={grid} 
                examples={examples} 
                onUpdate={onUpdate}
              />
            )}
            {grid.type === 'div' && (
              <TrackerDivGrid 
                grid={grid} 
                examples={examples} 
                onUpdate={onUpdate}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

