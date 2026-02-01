import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TrackerFieldType, TrackerOption } from './types'

interface TrackerCellProps {
  value: unknown
  type: TrackerFieldType
  options?: TrackerOption[]
}

export function TrackerCell({ value, type, options }: TrackerCellProps) {
  if (value === null || value === undefined) return <span>-</span>

  const getLabel = (val: string) => {
    if (!options?.length) return val
    const byValue = options.find((o) => String(o.value) === val)
    if (byValue) return byValue.label ?? val
    const byId = options.find((o) => o.id === val)
    return byId?.label ?? val
  }

  switch (type) {
    case 'boolean':
      return (
        <div className="flex items-center justify-center">
          <Checkbox checked={value === true} disabled />
        </div>
      )
    case 'options':
      return <Badge variant="secondary">{getLabel(String(value))}</Badge>
    case 'multiselect':
      return (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(value) && value.length > 0 ? (
            value.map((val) => (
              <Badge key={String(val)} variant="outline" className="text-xs">
                {getLabel(String(val))}
              </Badge>
            ))
          ) : (
            <span>-</span>
          )}
        </div>
      )
    case 'date':
      return <span>{new Date(String(value)).toLocaleDateString()}</span>
    case 'link':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {String(value)}
        </a>
      )
    case 'currency':
      const currencyValue = Number(value)
      return (
        <span>
          {!isNaN(currencyValue)
            ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(currencyValue)
            : String(value)}
        </span>
      )
    case 'percentage':
      const percentValue = Number(value)
      return (
        <span>
          {!isNaN(percentValue) ? `${percentValue}%` : String(value)}
        </span>
      )
    default:
      return <span>{String(value)}</span>
  }
}
