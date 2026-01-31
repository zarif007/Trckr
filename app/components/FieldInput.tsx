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
import { MultiSelect } from '@/components/ui/multi-select'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { TrackerField } from './tracker-display/types'
import { resolveFieldOptions } from './tracker-display/resolve-options'

interface FieldInputProps {
  field: TrackerField
  value: unknown
  onChange: (value: unknown) => void
  className?: string
  isInline?: boolean
  autoFocus?: boolean
  gridData?: Record<string, Array<Record<string, unknown>>>
}

export function FieldInput({
  field,
  value,
  onChange,
  className = '',
  isInline = false,
  autoFocus = false,
  gridData,
}: FieldInputProps) {
  const normalInputClass = `bg-background text-foreground ${className}`
  const inlineInputClass =
    'border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 h-full px-2'

  const resolvedOptions = resolveFieldOptions(field, gridData)

  switch (field.dataType) {
    case 'string':
      return (
        <Input
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={isInline ? inlineInputClass : normalInputClass}
          autoFocus={autoFocus}
          required={field.config?.required}
          minLength={field.config?.minLength}
          maxLength={field.config?.maxLength}
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          value={typeof value === 'number' || typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={isInline ? inlineInputClass : normalInputClass}
          autoFocus={autoFocus}
          required={field.config?.required}
          min={field.config?.min}
          max={field.config?.max}
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
                  format(new Date(String(value)), 'PPP')
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
                {value ? format(new Date(String(value)), 'PPP') : field.ui.label}
              </Button>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(String(value)) : undefined}
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
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={
            isInline
              ? 'border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 resize-none h-full px-2'
              : normalInputClass
          }
          rows={isInline ? 1 : 3}
          autoFocus={autoFocus}
          required={field.config?.required}
          minLength={field.config?.minLength}
          maxLength={field.config?.maxLength}
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
            checked={value === true}
            onCheckedChange={onChange}
            id={field.id}
            autoFocus={autoFocus}
            required={field.config?.required}
          />
          {!isInline && (
            <label htmlFor={field.id} className="text-sm font-medium">
              {field.ui.label}
            </label>
          )}
        </div>
      )
    case 'options':
      return (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={onChange}
          defaultOpen={autoFocus}
        >
          <SelectTrigger
            className={
              isInline
                ? 'h-full w-full hover:bg-transparent text-left text-foreground border-0 bg-transparent shadow-none focus:ring-0 focus-visible:ring-0 hover:bg-transparent'
                : normalInputClass
            }
            style={
              isInline ? { border: 'none', background: 'transparent' } : {}
            }
            autoFocus={autoFocus}
          >
            <SelectValue placeholder={isInline ? '' : field.ui.placeholder || field.ui.label} />
          </SelectTrigger>
          <SelectContent>
            {resolvedOptions?.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'multiselect':
      return (
        <MultiSelect
          options={
            resolvedOptions?.map((opt) => ({
              id: opt.id ?? String(opt.value ?? ''),
              label: opt.label,
            })) ?? []
          }
          value={Array.isArray(value) ? value.map(String) : []}
          onChange={onChange}
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          className={isInline ? '' : normalInputClass}
          isInline={isInline}
          autoFocus={autoFocus}
        />
      )
    default:
      return null
  }
}
