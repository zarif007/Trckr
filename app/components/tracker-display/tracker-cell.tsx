import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TrackerFieldType } from './types'

interface TrackerCellProps {
  value: any
  type: TrackerFieldType
}

export function TrackerCell({ value, type }: TrackerCellProps) {
  if (value === null || value === undefined) return <span>-</span>

  switch (type) {
    case 'boolean':
      return (
        <div className="flex items-center justify-center">
          <Checkbox checked={value || false} disabled />
        </div>
      )
    case 'options':
      return <Badge variant="secondary">{value}</Badge>
    case 'date':
      return <span>{new Date(value).toLocaleDateString()}</span>
    default:
      return <span>{String(value)}</span>
  }
}
