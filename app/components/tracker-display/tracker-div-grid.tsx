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
import { resolveFieldOptions } from './resolve-options'

interface TrackerDivGridProps {
  grid: TrackerGrid & { fields: TrackerField[] }
  rows: Array<Record<string, unknown>>
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
}

export function TrackerDivGrid({
  grid,
  rows,
  gridData,
  onUpdate,
}: TrackerDivGridProps) {
  if (rows.length === 0) return null

  const dataToDisplay = rows[0]

  if (!dataToDisplay) return null

  const isVertical = (grid.config as { layout?: 'vertical' | 'horizontal' } | undefined)?.layout === 'vertical'

  return (
    <div className="w-full max-w-4xl">
      <div className={`grid gap-x-8 gap-y-6 ${isVertical ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {grid.fields.map((field) => {
          const value = dataToDisplay[field.key]
          const valueString =
            typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)

          const renderField = () => {
            switch (field.dataType) {
              case 'text':
                return (
                  <Textarea
                    className="min-h-[100px] text-sm leading-7 text-foreground/90 bg-secondary/20 border-border/50 focus-visible:ring-1"
                    defaultValue={valueString}
                    onBlur={(e) =>
                      onUpdate?.(0, field.key, e.target.value)
                    }
                  />
                )
              case 'boolean':
                return (
                  <div className="flex items-center min-h-[2.5rem]">
                    <Checkbox
                      checked={value === true}
                      onCheckedChange={(checked) =>
                        onUpdate?.(0, field.key, checked)
                      }
                    />
                  </div>
                )
              case 'options': {
                const options = resolveFieldOptions(field, gridData) ?? []
                return (
                  <Select
                    value={typeof value === 'string' ? value : ''}
                    onValueChange={(val) => onUpdate?.(0, field.key, val)}
                  >
                    <SelectTrigger className="w-full bg-secondary/10 border-border/50">
                      <SelectValue placeholder={`Select ${field.ui.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
              case 'multiselect': {
                const multiOptions = resolveFieldOptions(field, gridData) ?? []
                return (
                  <MultiSelect
                    options={multiOptions}
                    value={Array.isArray(value) ? value.map(String) : []}
                    onChange={(val) => onUpdate?.(0, field.key, val)}
                    placeholder={`Select ${field.ui.label}`}
                    className="w-full bg-secondary/10 border-border/50"
                  />
                )
              }
              case 'date':
                return (
                  <Input
                    type="date"
                    className="bg-secondary/10 border-border/50"
                    defaultValue={
                      value
                        ? new Date(String(value)).toISOString().split('T')[0]
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
                    defaultValue={typeof value === 'number' ? value : valueString}
                    onBlur={(e) =>
                      onUpdate?.(0, field.key, Number(e.target.value))
                    }
                  />
                )
              default:
                return (
                  <Input
                    className="bg-secondary/10 border-border/50"
                    defaultValue={valueString}
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
              className={`space-y-2 ${field.dataType === 'text' ? 'col-span-1 md:col-span-2' : 'col-span-1'
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
