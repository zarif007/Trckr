import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { TrackerGrid, TrackerField } from './types'

interface TrackerDivGridProps {
  grid: TrackerGrid & { fields: TrackerField[] }
  examples: Array<Record<string, any>>
  onUpdate?: (rowIndex: number, columnId: string, value: any) => void
}

export function TrackerDivGrid({
  grid,
  examples,
  onUpdate,
}: TrackerDivGridProps) {
  if (examples.length === 0) return null

  const dataToDisplay = examples[0]

  if (!dataToDisplay) return null

  return (
    <div className="w-full max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {grid.fields.map((field) => {
          const value = dataToDisplay[field.key]

          const renderField = () => {
            switch (field.dataType) {
              case 'text':
                return (
                  <Textarea
                    className="min-h-[100px] text-sm leading-7 text-foreground/90 bg-secondary/20 border-border/50 focus-visible:ring-1"
                    defaultValue={value || ''}
                    onBlur={(e) =>
                      onUpdate?.(0, field.key, e.target.value)
                    }
                  />
                )
              case 'boolean':
                return (
                  <div className="flex items-center min-h-[2.5rem]">
                    <Checkbox
                      checked={value || false}
                      onCheckedChange={(checked) =>
                        onUpdate?.(0, field.key, checked)
                      }
                    />
                  </div>
                )
              case 'options':
                return (
                  <Select
                    value={value || ''}
                    onValueChange={(val) => onUpdate?.(0, field.key, val)}
                  >
                    <SelectTrigger className="w-full bg-secondary/10 border-border/50">
                      <SelectValue placeholder={`Select ${field.ui.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.config?.options?.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              case 'multiselect':
                return (
                  <MultiSelect
                    options={field.config?.options?.map(o => o.label) || []}
                    value={Array.isArray(value) ? value : []}
                    onChange={(val) => onUpdate?.(0, field.key, val)}
                    placeholder={`Select ${field.ui.label}`}
                    className="w-full bg-secondary/10 border-border/50"
                  />
                )
              case 'date':
                return (
                  <Input
                    type="date"
                    className="bg-secondary/10 border-border/50"
                    defaultValue={
                      value
                        ? new Date(value).toISOString().split('T')[0]
                        : undefined
                    }
                    onBlur={(e) =>
                      onUpdate?.(0, field.key, e.target.value)
                    }
                  />
                )
              case 'number':
                return (
                  <Input
                    type="number"
                    className="bg-secondary/10 border-border/50"
                    defaultValue={value}
                    onBlur={(e) =>
                      onUpdate?.(0, field.key, Number(e.target.value))
                    }
                  />
                )
              default:
                return (
                  <Input
                    className="bg-secondary/10 border-border/50"
                    defaultValue={value || ''}
                    onBlur={(e) =>
                      onUpdate?.(0, field.key, e.target.value)
                    }
                  />
                )
            }
          }

          return (
            <div
              key={field.key}
              className={`space-y-2 ${
                field.dataType === 'text' ? 'col-span-1 md:col-span-2' : 'col-span-1'
              }`}
            >
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {field.ui.label}
              </label>
              {renderField()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
