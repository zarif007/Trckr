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
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerOptionTable,
} from './types'

interface TrackerDivGridProps {
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  fields: TrackerField[]
  optionTables: TrackerOptionTable[]
  gridData?: Record<string, Array<Record<string, unknown>>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
}

export function TrackerDivGrid({
  grid,
  layoutNodes,
  fields,
  optionTables,
  gridData,
  onUpdate,
}: TrackerDivGridProps) {
  // Div Grid primarily renders individual fields connected via layoutNodes
  const fieldNodes = layoutNodes.filter(n => n.refType === 'field').sort((a,b) => a.order - b.order)
  
  // Also support single-row data from gridData (index 0)
  const data = gridData?.[grid.id]?.[0] || {}

  if (fieldNodes.length === 0) return null
  
  const isVertical = (grid.config as { layout?: 'vertical' | 'horizontal' } | undefined)?.layout === 'vertical'

  return (
    <div className={`grid gap-4 ${isVertical ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
      {fieldNodes.map((node) => {
        const field = fields.find(f => f.id === node.refId)
        if (!field) return null
        
        // Resolve options if needed
        let options: Array<{ label: string; value: any; id?: string }> | undefined = undefined
        if (field.dataType === 'options' || field.dataType === 'multiselect') {
            const mappingId = field.config?.optionsMappingId
            if (mappingId) {
                options = optionTables.find(t => t.id === mappingId)?.options
            }
        }
        
        const value = data[field.id]
        const valueString = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)

        const renderInput = () => {
             switch (field.dataType) {
              case 'text':
                return (
                  <Textarea
                    className="min-h-[100px] text-sm leading-7 text-foreground/90 bg-secondary/20 border-border/50 focus-visible:ring-1"
                    defaultValue={valueString}
                    onBlur={(e) =>
                      onUpdate?.(0, field.id, e.target.value)
                    }
                  />
                )
              case 'boolean':
                return (
                  <div className="flex items-center min-h-[2.5rem]">
                    <Checkbox
                      checked={value === true}
                      onCheckedChange={(checked) =>
                        onUpdate?.(0, field.id, checked)
                      }
                    />
                  </div>
                )
              case 'options': {
                const opts = options ?? []
                return (
                  <Select
                    value={typeof value === 'string' ? value : ''}
                    onValueChange={(val) => onUpdate?.(0, field.id, val)}
                  >
                    <SelectTrigger className="w-full bg-secondary/10 border-border/50">
                      <SelectValue placeholder={`Select ${field.ui.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map((option) => (
                        <SelectItem key={option.id || String(option.value) || option.label} value={String(option.value ?? option.id ?? option.label)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
              case 'multiselect': {
                 const opts = options ?? []
                 // adapt options for MultiSelect which expects {id, label}
                 const multiOpts = opts.map(o => ({ label: o.label, id: String(o.value ?? o.id ?? o.label) }))
                 return (
                  <MultiSelect
                    options={multiOpts}
                    value={Array.isArray(value) ? value.map(String) : []}
                    onChange={(val) => onUpdate?.(0, field.id, val)}
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
                      onUpdate?.(0, field.id, e.target.value)
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
                      onUpdate?.(0, field.id, Number(e.target.value))
                    }
                  />
                )
              default:
                return (
                  <Input
                    className="bg-secondary/10 border-border/50"
                    defaultValue={valueString}
                    onBlur={(e) =>
                      onUpdate?.(0, field.id, e.target.value)
                    }
                  />
                )
            }
        }

        return (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {field.ui.label}
            </label>
            <div className={`p-2 bg-secondary/20 rounded-md border border-border/50 ${field.dataType === 'text' ? 'h-auto' : ''}`}>
               {renderInput()}
            </div>
          </div>
        )
      })}
    </div>
  )
}
