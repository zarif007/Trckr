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

type FieldType = 'string' | 'number' | 'date' | 'options' | 'boolean' | 'text'

interface FieldMetadata {
  name: string
  fieldName: string
  type: FieldType
  options?: string[]
}

interface FieldInputProps {
  field: FieldMetadata
  value: any
  onChange: (value: any) => void
  className?: string
  isInline?: boolean
  autoFocus?: boolean
}

export function FieldInput({
  field,
  value,
  onChange,
  className = '',
  isInline = false,
  autoFocus = false,
}: FieldInputProps) {
  const normalInputClass = `bg-background text-foreground ${className}`
  const inlineInputClass =
    'border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 h-full px-2'

  switch (field.type) {
    case 'string':
      return (
        <Input
          placeholder={isInline ? '' : field.name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={isInline ? inlineInputClass : normalInputClass}
          autoFocus={autoFocus}
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          placeholder={isInline ? '' : field.name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={isInline ? inlineInputClass : normalInputClass}
          autoFocus={autoFocus}
        />
      )
    case 'date':
      return (
        <Popover defaultOpen={autoFocus}>
          <PopoverTrigger asChild>
            {isInline ? (
              <button
                className="h-full w-full px-2 text-left font-normal text-foreground flex items-center"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                }}
                autoFocus={autoFocus}
              >
                {value ? (
                  format(new Date(value), 'PPP')
                ) : (
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <Button
                variant="outline"
                className={`justify-start text-left font-normal bg-background text-foreground w-full ${className}`}
                autoFocus={autoFocus}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : field.name}
              </Button>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(date) => {
                if (date) {
                  onChange(date)
                }
              }}
              disabled={(date) =>
                date > new Date() || date < new Date('1900-01-01')
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )
    case 'text':
      return (
        <Textarea
          placeholder={isInline ? '' : field.name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={
            isInline
              ? 'border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 resize-none h-full px-2'
              : normalInputClass
          }
          rows={isInline ? 1 : 3}
          autoFocus={autoFocus}
        />
      )
    case 'boolean':
      return (
        <div
          className={
            isInline
              ? 'flex items-center h-full px-4'
              : 'flex items-center gap-2'
          }
        >
          <Checkbox
            checked={value || false}
            onCheckedChange={onChange}
            id={field.fieldName}
            autoFocus={autoFocus}
          />
          {!isInline && (
            <label htmlFor={field.fieldName} className="text-sm font-medium">
              {field.name}
            </label>
          )}
        </div>
      )
    case 'options':
      return (
        <Select value={value ?? ''} onValueChange={onChange} defaultOpen={autoFocus}>
          <SelectTrigger
            className={
              isInline
                ? 'h-full w-full px-2 text-left text-foreground border-0 bg-transparent shadow-none focus:ring-0 focus-visible:ring-0 hover:bg-transparent'
                : normalInputClass
            }
            style={
              isInline ? { border: 'none', background: 'transparent' } : {}
            }
            autoFocus={autoFocus}
          >
            <SelectValue placeholder={isInline ? '' : field.name} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    default:
      return null
  }
}
