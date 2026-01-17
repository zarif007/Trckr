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
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { FieldType } from './utils'
import { cn } from '@/lib/utils'

interface DataTableInputProps {
  value: any
  onChange: (value: any) => void
  type: FieldType
  options?: string[]
  className?: string
  autoFocus?: boolean
}

export function DataTableInput({
  value,
  onChange,
  type,
  options,
  className,
  autoFocus,
}: DataTableInputProps) {
  const inlineInputClass =
    'border-0 bg-transparent dark:bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 focus-visible:bg-muted/50 h-full px-2 w-full text-[13px] font-normal rounded-md transition-colors'

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
                  // Adjust for timezone offset to prevent date shifting
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
    case 'options':
      return (
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger
            className={cn(
              inlineInputClass,
              "text-left px-2 border-0 shadow-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50",
              className
            )}
          >
            <div className="truncate">
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    default:
      return <span className="px-2">{String(value)}</span>
  }
}


