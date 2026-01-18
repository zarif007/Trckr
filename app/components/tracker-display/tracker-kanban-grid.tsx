import { Card } from '@/components/ui/card'
import { TrackerGrid, TrackerField } from './types'
import { TrackerCell } from './tracker-cell'

interface TrackerKanbanGridProps {
  grid: TrackerGrid & { fields: TrackerField[] }
  examples: Array<Record<string, any>>
}

export function TrackerKanbanGrid({ grid, examples }: TrackerKanbanGridProps) {
  if (examples.length === 0) return null

  const optionsField = grid.fields.find((f) => f.type === 'options')

  if (!optionsField) {
    return (
      <div className="text-muted-foreground text-sm">
        Kanban view requires an options field to group by
      </div>
    )
  }

  const groups = optionsField.options || []
  const cardFields = grid.fields.filter(
    (f) => f.fieldName !== optionsField.fieldName
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map((group) => {
        const cardsInGroup = examples.filter(
          (ex) => ex[optionsField.fieldName] === group
        )
        return (
          <div key={group} className="shrink-0 w-80">
            <div className="bg-gray-50 dark:bg-black rounded-md p-4 mb-4">
              <h3 className="font-semibold text-foreground">{group}</h3>
            </div>
            <div className="space-y-3">
              {cardsInGroup.map((card, idx) => (
                <Card
                  key={idx}
                  className="p-4 bg-card border-border hover:shadow-md transition-shadow"
                >
                  {cardFields.map((field) => (
                    <div key={field.fieldName} className="mb-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        {field.name}
                      </p>
                      <p className="text-sm text-foreground">
                        <TrackerCell value={card[field.fieldName]} type={field.type} />
                      </p>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
