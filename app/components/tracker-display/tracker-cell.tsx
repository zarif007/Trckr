import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TrackerFieldType } from './types'

interface TrackerCellProps {
  value: any
  type: TrackerFieldType
  options?: { id: string; label: string }[]
}

export function TrackerCell({ value, type, options }: TrackerCellProps) {
  if (value === null || value === undefined) return <span>-</span>

  const getLabel = (val: string) => {
    return options?.find((o) => o.id === val)?.label || val
  }

  switch (type) {
    case 'boolean':
      return (
        <div className="flex items-center justify-center">
          <Checkbox checked={value || false} disabled />
        </div>
      )
    case 'options':
      return <Badge variant="secondary">{getLabel(value)}</Badge>
    case 'multiselect':
      return (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(value) && value.length > 0 ? (
            value.map((val: string) => (
               <Badge key={val} variant="outline" className="text-xs">
                 {getLabel(val)}
               </Badge>
            ))
          ) : (
            <span>-</span>
          )}
        </div>
      )
    case 'date':
      return <span>{new Date(value).toLocaleDateString()}</span>
    default:
      return <span>{String(value)}</span>
  }
}
