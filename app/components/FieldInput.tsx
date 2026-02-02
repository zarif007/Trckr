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
import { TrackerField, TrackerBindingEntry } from './tracker-display/types'
import { resolveFieldOptionsLegacy } from './tracker-display/resolve-options'
import { findOptionRow, applyBindings, parsePath, resolveOptionsFromBinding, buildFieldPath } from '@/lib/resolve-bindings'

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
    case 'number':
    case 'currency':
    case 'percentage': {
      if (value === '' || value === undefined || value === null) return null
      const n = typeof value === 'number' ? value : parseFloat(String(value))
      if (Number.isNaN(n)) return 'Enter a valid number'
      if (typeof min === 'number' && n < min) return `Must be at least ${min}`
      if (typeof max === 'number' && n > max) return `Must be at most ${max}`
      return null
    }
    case 'link': {
      const s = typeof value === 'string' ? value : ''
      if (s.length === 0) return null
      try {
        new URL(s)
        return null
      } catch {
        return 'Enter a valid URL'
      }
    }
    case 'date':
    case 'options':
    case 'multiselect':
    case 'boolean':
    default:
      return null
  }
}

/** Update for a bound field */
export interface BindingUpdate {
  fieldId: string
  value: unknown
}

interface FieldInputProps {
  field: TrackerField
  value: unknown
  onChange: (value: unknown) => void
  className?: string
  isInline?: boolean
  autoFocus?: boolean
  gridData?: Record<string, Array<Record<string, unknown>>>
  /** Tab ID and grid ID for binding resolution (required when using binding) */
  tabId?: string
  gridId?: string
  /** Binding entry for this field (if it's a select/multiselect) */
  binding?: TrackerBindingEntry
  /** Callback for binding updates when an option is selected */
  onBindingUpdates?: (updates: BindingUpdate[]) => void
}

export function FieldInput({
  field,
  value,
  onChange,
  className = '',
  isInline = false,
  autoFocus = false,
  gridData,
  tabId,
  gridId,
  binding,
  onBindingUpdates,
}: FieldInputProps) {
  const normalInputClass = `bg-background text-foreground ${className}`
  const inlineInputClass =
    'border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 h-full px-2'

  const selectFieldPath = gridId ? buildFieldPath(gridId, field.id) : ''

  // Resolve options: prefer binding, fall back to inline config.options
  const resolvedOptions = binding && gridData && selectFieldPath
    ? resolveOptionsFromBinding(binding, gridData, selectFieldPath)
    : resolveFieldOptionsLegacy(field, gridData)
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
    case 'link':
      return wrapWithError(
        <Input
          type="url"
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label || 'https://...'}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleChange(e.target.value)}
          className={isInline ? inlineInputClass : normalInputClass}
          autoFocus={autoFocus}
          disabled={isDisabled}
          required={isRequired}
          aria-required={isRequired}
          aria-invalid={showError}
        />
      )
    case 'currency': {
      const currencySymbol = (config.currencySymbol as string) ?? '$'
      const numVal = value === '' || value === undefined || value === null ? '' : (typeof value === 'number' ? value : parseFloat(String(value)))
      const displayVal = numVal === '' ? '' : (Number.isNaN(Number(numVal)) ? numVal : String(numVal))
      return wrapWithError(
        <div className={isInline ? 'flex items-center h-full' : 'relative'}>
          {!isInline && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {currencySymbol}
            </span>
          )}
          <Input
            type="number"
            step="any"
            placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
            value={displayVal}
            onChange={(e) => {
              const v = e.target.value
              handleChange(v === '' ? '' : parseFloat(v))
            }}
            className={
              isInline
                ? inlineInputClass
                : `pl-7 ${normalInputClass}`
            }
            autoFocus={autoFocus}
            disabled={isDisabled}
            required={isRequired}
            aria-required={isRequired}
            aria-invalid={showError}
            min={config.min}
            max={config.max}
          />
        </div>
      )
    }
    case 'percentage': {
      const numVal = value === '' || value === undefined || value === null ? '' : (typeof value === 'number' ? value : parseFloat(String(value)))
      const displayVal = numVal === '' ? '' : (Number.isNaN(Number(numVal)) ? numVal : String(numVal))
      return wrapWithError(
        <div className={isInline ? 'flex items-center h-full' : 'relative'}>
          <Input
            type="number"
            step="any"
            placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
            value={displayVal}
            onChange={(e) => {
              const v = e.target.value
              handleChange(v === '' ? '' : parseFloat(v))
            }}
            className={
              isInline ? inlineInputClass : `pr-8 ${normalInputClass}`
            }
            autoFocus={autoFocus}
            disabled={isDisabled}
            required={isRequired}
            aria-required={isRequired}
            aria-invalid={showError}
            min={config.min ?? 0}
            max={config.max ?? 100}
          />
          {!isInline && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              %
            </span>
          )}
        </div>
      )
    }
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

      // Handle select change with binding support
      const handleSelectChange = (v: string) => {
        const selectedValue = v === SELECT_EMPTY_VALUE ? '' : v
        handleChange(selectedValue)

        // Apply bindings if present
        if (binding && gridData && onBindingUpdates && selectFieldPath && selectedValue !== '') {
          const optionRow = findOptionRow(gridData, binding, selectedValue, selectFieldPath)
          if (optionRow) {
            const updates = applyBindings(binding, optionRow, selectFieldPath)
            // Convert full paths to local fieldIds
            const localUpdates: BindingUpdate[] = updates
              .map((u) => {
                const { fieldId } = parsePath(u.targetPath)
                return fieldId ? { fieldId, value: u.value } : null
              })
              .filter((u): u is BindingUpdate => u !== null)

            if (localUpdates.length > 0) {
              onBindingUpdates(localUpdates)
            }
          }
        }
      }

      return wrapWithError(
        <Select
          value={typeof value === 'string' ? (value.trim() === '' ? SELECT_EMPTY_VALUE : value) : SELECT_EMPTY_VALUE}
          onValueChange={handleSelectChange}
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
    case 'multiselect': {
      // Handle multiselect change with binding support
      const handleMultiSelectChange = (selectedValues: string[]) => {
        handleChange(selectedValues)

        // Apply bindings for the last selected value (if any new selection)
        // Note: For multiselect, bindings are applied for the most recently added value
        if (binding && gridData && onBindingUpdates && selectFieldPath && selectedValues.length > 0) {
          const currentValues = Array.isArray(value) ? value.map(String) : []
          const newValues = selectedValues.filter((v) => !currentValues.includes(v))

          if (newValues.length > 0) {
            // Apply bindings for the first newly selected value
            const newValue = newValues[0]
            const optionRow = findOptionRow(gridData, binding, newValue, selectFieldPath)
            if (optionRow) {
              const updates = applyBindings(binding, optionRow, selectFieldPath)
              const localUpdates: BindingUpdate[] = updates
                .map((u) => {
                  const { fieldId } = parsePath(u.targetPath)
                  return fieldId ? { fieldId, value: u.value } : null
                })
                .filter((u): u is BindingUpdate => u !== null)

              if (localUpdates.length > 0) {
                onBindingUpdates(localUpdates)
              }
            }
          }
        }
      }

      return wrapWithError(
        <MultiSelect
          options={
            resolvedOptions?.map((opt) => ({
              id: opt.id ?? String(opt.value ?? ''),
              label: opt.label,
            })) ?? []
          }
          value={Array.isArray(value) ? value.map(String) : []}
          onChange={handleMultiSelectChange}
          placeholder={isInline ? '' : field.ui.placeholder || field.ui.label}
          className={isInline ? '' : normalInputClass}
          isInline={isInline}
          autoFocus={autoFocus}
          required={isRequired}
          disabled={isDisabled}
          aria-invalid={showError}
        />
      )
    }
    default:
      return null
  }
}
