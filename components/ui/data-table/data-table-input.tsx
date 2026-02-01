'use client'

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
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { FieldType, FieldConfig } from './utils'
import { cn } from '@/lib/utils'
import { MultiSelect } from '@/components/ui/multi-select'

interface DataTableInputProps {
  value: any
  onChange: (value: any) => void
  type: FieldType
  options?: (string | { id: string; label: string })[]
  config?: FieldConfig | null
  className?: string
  autoFocus?: boolean
}

export function DataTableInput({
  value,
  onChange,
  type,
  options,
  config: _config,
  className,
  autoFocus,
}: DataTableInputProps) {
  const inlineInputClass =
    'border-0 bg-transparent dark:bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 h-full px-2 w-full text-[13px] font-normal rounded-none transition-colors'

  switch (type) {
    case 'string':
    case 'number':
      return (
        <Input
          type={type === 'number' ? 'number' : 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          autoFocus={autoFocus}
        />
      )
    case 'date':
      return (
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(inlineInputClass, "text-left flex items-center", className)}
              autoFocus={autoFocus}
            >
              {value ? (
                format(new Date(value), 'PPP')
              ) : (
                <span className="text-muted-foreground">Pick a date</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[60]" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(date) => {
                if (date) {
                  const newDate = new Date(date)
                  newDate.setMinutes(newDate.getMinutes() - newDate.getTimezoneOffset())
                  onChange(newDate.toISOString())
                }
              }}
              disabled={(date) =>
                date > new Date('2100-01-01') || date < new Date('1900-01-01')
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )
    case 'text':
      return (
        <Input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          autoFocus={autoFocus}
        />
      )
    case 'boolean':
      return (
        <div className="flex items-center justify-center h-full w-full">
          <Checkbox
            checked={value === true}
            onCheckedChange={onChange}
          />
        </div>
      )
    case 'options': {
      const selectValue = (value === '' || value == null) ? '__empty__' : String(value)
      return (
        <Select value={selectValue} onValueChange={(v) => onChange(v === '__empty__' ? '' : v)}>
          <SelectTrigger
            className={cn(
              inlineInputClass,
              "text-left px-2 border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 h-full w-full",
              className
            )}
          >
            <div className="truncate">
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => {
              const optValueRaw = typeof option === 'string' ? option : option.id
              const optLabel = typeof option === 'string' ? option : option.label
              const optValue = (typeof optValueRaw === 'string' ? optValueRaw : String(optValueRaw ?? optLabel ?? '')).trim() || '__empty__'
              return (
                <SelectItem key={optValue} value={optValue}>
                  {optLabel}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )
    }
    case 'multiselect':
      return (
        <MultiSelect
          options={options ?? []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          isInline={true}
          className={cn(inlineInputClass, className)}
        />
      )
    case 'link':
      return (
        <Input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          placeholder="https://"
          autoFocus={autoFocus}
        />
      )
    case 'currency':
    case 'percentage':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          autoFocus={autoFocus}
        />
      )
    default:
      return <span className="px-2">{String(value)}</span>
  }
}
