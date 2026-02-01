'use client'

import { useState } from 'react'
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
import { TrackerField, TrackerOptionTable } from './tracker-display/types'
import { resolveFieldOptions } from './tracker-display/resolve-options'

function getFieldValidationError(
  field: TrackerField,
  value: unknown
): string | null {
  const config = field.config ?? {}
  const { isRequired, min, max, minLength, maxLength } = config

  const isEmpty = (v: unknown) =>
    v === undefined ||
    v === null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0)

  if (isRequired && isEmpty(value)) return 'Required'

  switch (field.dataType) {
    case 'string':
    case 'text': {
      const s = typeof value === 'string' ? value : ''
      if (typeof minLength === 'number' && s.length < minLength)
        return `At least ${minLength} characters`
      if (typeof maxLength === 'number' && s.length > maxLength)
        return `At most ${maxLength} characters`
      return null
    }
    case 'number': {
      if (value === '' || value === undefined || value === null) return null
      const n = typeof value === 'number' ? value : parseFloat(String(value))
      if (Number.isNaN(n)) return 'Enter a valid number'
      if (typeof min === 'number' && n < min) return `Must be at least ${min}`
      if (typeof max === 'number' && n > max) return `Must be at most ${max}`
      return null
    }
    case 'date':
    case 'options':
    case 'multiselect':
    case 'boolean':
    default:
      return null
  }
}

interface FieldInputProps {
  field: TrackerField
  value: unknown
  onChange: (value: unknown) => void
  className?: string
  isInline?: boolean
  autoFocus?: boolean
  optionTables?: TrackerOptionTable[]
}

export function FieldInput({
  field,
  value,
  onChange,
  className = '',
  isInline = false,
  autoFocus = false,
  optionTables = [],
}: FieldInputProps) {
  const normalInputClass = `bg-background text-foreground ${className}`
  const inlineInputClass =
    'border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 h-full px-2'

  const resolvedOptions = resolveFieldOptions(field, optionTables)
  const config = field.config ?? {}
  const isDisabled = config.isDisabled
  const isHidden = config.isHidden
  const isRequired = config.isRequired
  const validationError = getFieldValidationError(field, value)
  const hasError = !!validationError
  const [dirty, setDirty] = useState(false)
  const showError = dirty && hasError

  const handleChange = (newValue: unknown) => {
    setDirty(true)
    onChange(newValue)
  }

  const errorEl = !isInline && showError && validationError ? (
    <p className="text-destructive text-xs mt-1" role="alert">
      {validationError}
    </p>
  ) : null

  const wrapWithError = (input: React.ReactNode) =>
    isInline ? (
      <span title={showError ? validationError! : undefined}>
        {input}
      </span>
    ) : (
      <div className="w-full space-y-1" title={showError ? validationError! : undefined}>
        {input}
        {errorEl}
      </div>
    )

  if (isHidden) return null

  switch (field.dataType) {
    case 'string':
      return wrapWithError(
        <Input
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleChange(e.target.value)}
          className={isInline ? inlineInputClass : normalInputClass}
          autoFocus={autoFocus}
          disabled={isDisabled}
          required={isRequired}
          aria-required={isRequired}
          aria-invalid={showError}
          minLength={config.minLength}
          maxLength={config.maxLength}
        />
      )
    case 'number':
      return wrapWithError(
        <Input
          type="number"
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          value={typeof value === 'number' || typeof value === 'string' ? value : ''}
          onChange={(e) => handleChange(e.target.value)}
          className={isInline ? inlineInputClass : normalInputClass}
          autoFocus={autoFocus}
          disabled={isDisabled}
          required={isRequired}
          aria-required={isRequired}
          aria-invalid={showError}
          min={config.min}
          max={config.max}
        />
      )
    case 'date':
      return wrapWithError(
        <Popover defaultOpen={autoFocus}>
          <PopoverTrigger asChild>
            {isInline ? (
              <button
                type="button"
                className="h-full w-full px-2 text-left font-normal text-foreground flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                }}
                autoFocus={autoFocus}
                disabled={isDisabled}
                aria-required={isRequired}
                aria-invalid={showError}
              >
                {value ? (
                  format(new Date(String(value)), 'PPP')
                ) : (
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className={`justify-start text-left font-normal bg-background text-foreground w-full ${className}`}
                autoFocus={autoFocus}
                disabled={isDisabled}
                aria-required={isRequired}
                aria-invalid={showError}
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
                  handleChange(date)
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
      return wrapWithError(
        <Textarea
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleChange(e.target.value)}
          className={
            isInline
              ? 'border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 resize-none h-full px-2'
              : normalInputClass
          }
          rows={isInline ? 1 : 3}
          autoFocus={autoFocus}
          disabled={isDisabled}
          required={isRequired}
          aria-required={isRequired}
          aria-invalid={showError}
          minLength={config.minLength}
          maxLength={config.maxLength}
        />
      )
    case 'boolean':
      return wrapWithError(
        <div
          className={
            isInline
              ? 'flex items-center h-full px-4'
              : 'flex items-center gap-2'
          }
        >
          <Checkbox
            checked={value === true}
            onCheckedChange={handleChange}
            id={field.id}
            autoFocus={autoFocus}
            disabled={isDisabled}
            aria-required={isRequired}
            aria-invalid={showError}
          />
          {!isInline && (
            <label htmlFor={field.id} className="text-sm font-medium">
              {field.ui.label}
            </label>
          )}
        </div>
      )
    case 'options': {
      const SELECT_EMPTY_VALUE = '__empty__'
      const toItemValue = (v: unknown) => {
        const s = String(v ?? '').trim()
        return s === '' ? SELECT_EMPTY_VALUE : s
      }
      return wrapWithError(
        <Select
          value={typeof value === 'string' ? (value.trim() === '' ? SELECT_EMPTY_VALUE : value) : SELECT_EMPTY_VALUE}
          onValueChange={(v) => handleChange(v === SELECT_EMPTY_VALUE ? '' : v)}
          defaultOpen={autoFocus}
          disabled={isDisabled}
        >
          <SelectTrigger
            aria-required={isRequired}
            aria-invalid={showError}
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
            {resolvedOptions?.map((option) => {
              const itemValue = toItemValue(option.value ?? option.id ?? option.label)
              return (
                <SelectItem key={option.id ?? itemValue} value={itemValue}>
                  {option.label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )
    }
    case 'multiselect':
      return wrapWithError(
        <MultiSelect
          options={
            resolvedOptions?.map((opt) => ({
              id: opt.id ?? String(opt.value ?? ''),
              label: opt.label,
            })) ?? []
          }
          value={Array.isArray(value) ? value.map(String) : []}
          onChange={handleChange}
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          className={isInline ? '' : normalInputClass}
          isInline={isInline}
          autoFocus={autoFocus}
          required={isRequired}
          disabled={isDisabled}
          aria-invalid={showError}
        />
      )
    default:
      return null
  }
}
