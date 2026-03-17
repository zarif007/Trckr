import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TrackerFieldType, TrackerOption } from './types'
import { format } from 'date-fns'

type DisplayFieldConfig = {
  dateFormat?: 'iso' | 'us' | 'eu' | 'long'
  numberDecimalPlaces?: number
  ratingMax?: number
  prefix?: string
}

interface TrackerCellProps {
  value: unknown
  type: TrackerFieldType
  options?: TrackerOption[]
  config?: DisplayFieldConfig
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 })

export function TrackerCell({ value, type, options, config }: TrackerCellProps) {
  if (value === null || value === undefined) return <span>-</span>
  const prefix = (config?.prefix ?? '').trim()

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
    case 'person':
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
      return (
        <span>
          {(() => {
            const dateValue = new Date(String(value))
            if (Number.isNaN(dateValue.getTime())) return String(value)
            if (config?.dateFormat === 'iso') return format(dateValue, 'yyyy-MM-dd')
            if (config?.dateFormat === 'us') return format(dateValue, 'MM/dd/yyyy')
            if (config?.dateFormat === 'eu') return format(dateValue, 'dd/MM/yyyy')
            return format(dateValue, 'MMM d, yyyy')
          })()}
        </span>
      )
    case 'link':
    case 'url':
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
    case 'email':
      return (
        <a href={`mailto:${String(value)}`} className="text-blue-500 hover:underline">
          {String(value)}
        </a>
      )
    case 'phone':
      return (
        <a href={`tel:${String(value)}`} className="text-blue-500 hover:underline">
          {String(value)}
        </a>
      )
    case 'currency':
      const currencyValue = Number(value)
      return (
        <span>
          {!isNaN(currencyValue)
            ? (() => {
                const formattedNumber =
                  typeof config?.numberDecimalPlaces === 'number'
                    ? numberFormatter.format(
                        Number(currencyValue.toFixed(config.numberDecimalPlaces))
                      )
                    : numberFormatter.format(currencyValue)
                if (prefix) return `${prefix}${formattedNumber}`
                return currencyFormatter.format(
                  typeof config?.numberDecimalPlaces === 'number'
                    ? Number(currencyValue.toFixed(config.numberDecimalPlaces))
                    : currencyValue
                )
              })()
            : `${prefix}${String(value)}`}
        </span>
      )
    case 'percentage':
      const percentValue = Number(value)
      return (
        <span>
          {!isNaN(percentValue)
            ? `${prefix}${typeof config?.numberDecimalPlaces === 'number' ? percentValue.toFixed(config.numberDecimalPlaces) : percentValue}%`
            : `${prefix}${String(value)}`}
        </span>
      )
    case 'status':
      return <Badge>{String(value)}</Badge>
    case 'rating':
      return <span>{String(value)} / {config?.ratingMax ?? 5}</span>
    case 'files': {
      const files = Array.isArray(value) ? value : [value]
      return <span>{files.length} file{files.length === 1 ? '' : 's'}</span>
    }
    default:
      return <span>{`${prefix}${String(value)}`}</span>
  }
}
