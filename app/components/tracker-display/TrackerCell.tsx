import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TrackerFieldType, TrackerOption } from './types'

interface TrackerCellProps {
  value: unknown
  type: TrackerFieldType
  options?: TrackerOption[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function TrackerCell({ value, type, options }: TrackerCellProps) {
  if (value === null || value === undefined) return <span>-</span>

  const optionLabelByKey = new Map<string, string>()
  if (options?.length) {
    options.forEach((o) => {
      const label = o.label ?? ''
      if (o.value !== undefined) optionLabelByKey.set(String(o.value), label)
      if (o.id !== undefined) optionLabelByKey.set(String(o.id), label)
    })
  }
  const getLabel = (val: string) => optionLabelByKey.get(val) ?? val

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
            ? currencyFormatter.format(currencyValue)
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
