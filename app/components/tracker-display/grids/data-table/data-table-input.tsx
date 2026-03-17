'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { FieldType, FieldConfig, type FieldMetadata, type OptionsGridFieldDef } from './utils'
import { cn } from '@/lib/utils'
import { DEFAULT_INPUT_FONT_CLASS, FIELD_INNER_INPUT_BASE_CLASS } from '@/lib/style-utils'
import { MultiSelect } from '@/components/ui/multi-select'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { EntryFormDialog } from './entry-form-dialog'
import type { FieldMapping } from '@/lib/types/tracker-bindings'

interface DataTableInputProps {
  value: any
  /** Second param optional: when adding an option, pass { bindingUpdates } so dialog can auto-populate dependent fields. */
  onChange: (value: any, options?: OnChangeOptions) => void
  type: FieldType
  options?: (string | { id: string; label: string })[]
  config?: FieldConfig | null
  className?: string
  autoFocus?: boolean
  disabled?: boolean
  /** Fields to show in the Add Option form (columns of the options grid). When set with onAddOption, dialog collects all values. */
  optionsGridFields?: OptionsGridFieldDef[]
  /** When set, select/multiselect shows "Add option". Pass full row; returns the new option value for the select. */
  onAddOption?: (row: Record<string, unknown>) => string
  /** When adding an option, compute binding updates from the new row (for auto-populate in Add Entry dialog). */
  getBindingUpdatesFromRow?: (row: Record<string, unknown>) => Record<string, unknown>
  /** When true, used inside a form (e.g. add/edit dialog); multiselect uses same styling as normal select. */
  formField?: boolean
  /** When true, used in table cell; textarea uses fixed row height and does not expand the row. */
  compact?: boolean
  /** When options are empty, show "No data" and "From table: {optionsSourceLabel}". */
  optionsSourceLabel?: string
}

/** Options passed when onChange is called after adding an option (so dialog can apply auto-populate). */
export interface OnChangeOptions {
  bindingUpdates?: Record<string, unknown>
}

const ADD_OPTION_VALUE = '__add_option__'

export function DataTableInput({
  value,
  onChange,
  type,
  options,
  config: _config,
  className,
  autoFocus,
  disabled,
  onAddOption,
  optionsGridFields,
  getBindingUpdatesFromRow,
  formField = false,
  compact = false,
  optionsSourceLabel,
}: DataTableInputProps) {
  const inlineInputClass = `${FIELD_INNER_INPUT_BASE_CLASS} h-full px-2 w-full rounded-none transition-colors ${DEFAULT_INPUT_FONT_CLASS} font-normal`

  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [addOptionOpen, setAddOptionOpen] = useState(false)
  const addOptionModeRef = useRef<'select' | 'multiselect'>('select')
  // Debounce string/text inputs to avoid lag on every keystroke
  const isStringOrText = type === 'string' || type === 'text'
  const [localStringValue, setLocalStringValue] = useState(() => (isStringOrText ? (value ?? '') : ''))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (isStringOrText) setLocalStringValue(value ?? '')
  }, [isStringOrText, value])
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const addOptionFieldMetadata: FieldMetadata = useMemo(() => {
    const meta: FieldMetadata = {}
    optionsGridFields?.forEach((f) => {
      meta[f.id] = {
        name: f.label,
        type: f.type,
        config: f.config,
        validations: f.validations,
      }
    })
    return meta
  }, [optionsGridFields])

  const addOptionFieldOrder = useMemo(
    () => optionsGridFields?.map((f) => f.id) ?? [],
    [optionsGridFields]
  )

  const selectOptions = useMemo(() => {
    return (options ?? []).map((option) => {
      const optValueRaw = typeof option === 'string' ? option : option.id
      const optLabel = typeof option === 'string' ? option : option.label
      const optValue =
        (typeof optValueRaw === 'string'
          ? optValueRaw
          : String(optValueRaw ?? optLabel ?? '')
        ).trim() || '__empty__'
      return { value: optValue, label: optLabel }
    })
  }, [options])

  const initialOptionValues = useMemo(() => {
    const initial: Record<string, unknown> = {}
    optionsGridFields?.forEach((f) => {
      initial[f.id] = f.type === 'number' ? '' : f.type === 'boolean' ? false : ''
    })
    return initial
  }, [optionsGridFields])

  const applyAddOption = (row: Record<string, unknown>) => {
    if (!onAddOption || !optionsGridFields) return
    const normalized = { ...row }
    optionsGridFields.forEach((f) => {
      if (normalized[f.id] === '' && (f.type === 'number' || f.type === 'string')) {
        normalized[f.id] = f.type === 'number' ? undefined : ''
      }
    })
    const newValue = onAddOption(normalized)
    const bindingUpdates = getBindingUpdatesFromRow?.(normalized) ?? {}
    if (addOptionModeRef.current === 'multiselect') {
      const current = Array.isArray(value) ? value : []
      onChange([...current, newValue], { bindingUpdates })
    } else {
      onChange(newValue, { bindingUpdates })
    }
  }

  const openAddOptionDialog = (mode: 'select' | 'multiselect') => {
    addOptionModeRef.current = mode
    setAddOptionOpen(true)
  }

  const config = _config ?? undefined
  const isDisabled = disabled ?? config?.isDisabled ?? false
  const prefix = typeof config?.prefix === 'string' ? config.prefix.trim() : ''
  const showPrefix =
    Boolean(prefix) &&
    (type === 'string' || type === 'number' || type === 'currency' || type === 'percentage')
  const withPrefixLeftPadding = showPrefix ? 'pl-9' : ''
  const statusOptions = (config?.statusOptions ?? [])
    .map((label) => String(label).trim())
    .filter(Boolean)
    .map((label) => ({ value: label, label }))

  const wrapWithPrefix = (child: React.ReactNode) => {
    if (!showPrefix) return child
    return (
      <div className="relative h-full w-full">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          {prefix}
        </span>
        {child}
      </div>
    )
  }

  switch (type) {
    case 'string':
    case 'number': {
      if (type === 'string') {
        return wrapWithPrefix(
          <Input
            type="text"
            value={localStringValue}
            onChange={(e) => {
              const v = e.target.value
              setLocalStringValue(v)
              if (debounceRef.current) clearTimeout(debounceRef.current)
              debounceRef.current = setTimeout(() => onChange(v), 250)
            }}
            onBlur={() => {
              if (debounceRef.current) {
                clearTimeout(debounceRef.current)
                debounceRef.current = null
              }
              const nextValue = localStringValue ?? ''
              const currentValue = value ?? ''
              if (nextValue !== currentValue) {
                // Let focus move to the next clicked field before committing.
                setTimeout(() => onChange(nextValue), 0)
              }
            }}
            className={cn(inlineInputClass, withPrefixLeftPadding, className)}
            autoFocus={autoFocus}
            disabled={isDisabled}
          />
        )
      }
      return wrapWithPrefix(
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, withPrefixLeftPadding, className)}
          autoFocus={autoFocus}
          disabled={isDisabled}
        />
      )
    }
    case 'date':
      return (
        <Popover modal={true} open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(inlineInputClass, "text-left flex items-center", className)}
              autoFocus={autoFocus}
              disabled={isDisabled}
            >
              {value ? (
                (() => {
                  const dateValue = new Date(value)
                  if (Number.isNaN(dateValue.getTime())) return String(value)
                  if (config?.dateFormat === 'iso') return format(dateValue, 'yyyy-MM-dd')
                  if (config?.dateFormat === 'us') return format(dateValue, 'MM/dd/yyyy')
                  if (config?.dateFormat === 'eu') return format(dateValue, 'dd/MM/yyyy')
                  return format(dateValue, 'PPP')
                })()
              ) : (
                <span className="text-muted-foreground">Pick a date</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[60]" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(selected) => {
                if (isDisabled) return
                if (selected instanceof Date) {
                  const newDate = new Date(selected)
                  newDate.setMinutes(newDate.getMinutes() - newDate.getTimezoneOffset())
                  onChange(newDate.toISOString())
                }
              }}
              onCloseRequest={() => setDatePickerOpen(false)}
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
        <Textarea
          value={localStringValue}
          onChange={(e) => {
            const v = e.target.value
            setLocalStringValue(v)
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => onChange(v), 250)
          }}
          onBlur={() => {
            if (debounceRef.current) {
              clearTimeout(debounceRef.current)
              debounceRef.current = null
            }
            const nextValue = localStringValue ?? ''
            const currentValue = value ?? ''
            if (nextValue !== currentValue) {
              // Let focus move to the next clicked field before committing.
              setTimeout(() => onChange(nextValue), 0)
            }
          }}
          className={cn(
            inlineInputClass,
            'py-1',
            compact ? 'min-h-0 h-10 resize-none overflow-auto' : 'min-h-[64px]',
            className
          )}
          autoFocus={autoFocus}
          disabled={isDisabled}
        />
      )
    case 'boolean':
      return (
        <div className="flex items-center justify-center h-full w-full">
          <Checkbox
            checked={value === true}
            onCheckedChange={onChange}
            disabled={isDisabled}
          />
        </div>
      )
    case 'options': {
      const selectValue = (value === '' || value == null) ? '__empty__' : String(value)
      return (
        <>
          <SearchableSelect
            options={selectOptions}
            value={selectValue}
            onValueChange={(v) => {
              if (v === ADD_OPTION_VALUE) {
                openAddOptionDialog('select')
                return
              }
              onChange(v === '__empty__' ? '' : v)
            }}
            placeholder=""
            searchPlaceholder=""
            className={cn(
              inlineInputClass,
              className,
              "text-left px-2 border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 h-full w-full"
            )}
            disabled={isDisabled}
            onAddOptionClick={onAddOption ? () => openAddOptionDialog('select') : undefined}
            addOptionLabel="Add option..."
            optionsSourceLabel={optionsSourceLabel}
          />
          {onAddOption && optionsGridFields && optionsGridFields.length > 0 && (
            <EntryFormDialog
              open={addOptionOpen}
              onOpenChange={setAddOptionOpen}
              title="Add option"
              submitLabel="Add"
              fieldMetadata={addOptionFieldMetadata}
              fieldOrder={addOptionFieldOrder}
              initialValues={initialOptionValues}
              onSave={applyAddOption}
              onSaveAnother={applyAddOption}
              mode="add"
            />
          )}
        </>
      )
    }
    case 'dynamic_select': {
      const selectValue = (value === '' || value == null) ? '__empty__' : String(value)
      return (
        <SearchableSelect
          options={selectOptions}
          value={selectValue}
          onValueChange={(v) => onChange(v === '__empty__' ? '' : v)}
          placeholder=""
          searchPlaceholder=""
          className={cn(
            inlineInputClass,
            className,
            "text-left px-2 border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 h-full w-full"
          )}
          disabled={isDisabled}
          optionsSourceLabel={optionsSourceLabel}
        />
      )
    }
    case 'multiselect':
    case 'dynamic_multiselect':
      return (
        <>
          <MultiSelect
            options={options ?? []}
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            isInline={!formField}
            className={formField ? cn(className, 'w-full text-left shadow-none dark:bg-transparent') : cn(inlineInputClass, className)}
            disabled={isDisabled}
            onAddOptionClick={type === 'multiselect' && onAddOption ? () => openAddOptionDialog('multiselect') : undefined}
            optionsSourceLabel={optionsSourceLabel}
          />
          {onAddOption && optionsGridFields && optionsGridFields.length > 0 && (
            <EntryFormDialog
              open={addOptionOpen}
              onOpenChange={setAddOptionOpen}
              title="Add option"
              submitLabel="Add"
              fieldMetadata={addOptionFieldMetadata}
              fieldOrder={addOptionFieldOrder}
              initialValues={initialOptionValues}
              onSave={applyAddOption}
              onSaveAnother={applyAddOption}
              mode="add"
            />
          )}
        </>
      )
    case 'field_mappings': {
      const mappings: FieldMapping[] = Array.isArray(value)
        ? value.filter((m): m is FieldMapping => m && typeof m === 'object' && typeof (m as FieldMapping).from === 'string' && typeof (m as FieldMapping).to === 'string')
        : []
      const updateAt = (index: number, next: FieldMapping) => {
        const nextList = [...mappings]
        nextList[index] = next
        onChange(nextList)
      }
      const removeAt = (index: number) => {
        const nextList = mappings.filter((_, i) => i !== index)
        onChange(nextList)
      }
      const append = () => onChange([...mappings, { from: '', to: '' }])
      const summary = mappings.length === 0 ? 'No mappings' : `${mappings.length} mapping${mappings.length === 1 ? '' : 's'}`
      const editor = (
        <div className="flex flex-col gap-1.5 w-full min-w-0 max-w-[420px]">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-wrap">
              <SearchableSelect
                options={selectOptions}
                value={m.from || '__empty__'}
                onValueChange={(v) => updateAt(i, { ...m, from: v === '__empty__' ? '' : v })}
                placeholder="From"
                searchPlaceholder="From..."
                className={cn(inlineInputClass, 'flex-1 min-w-[80px]')}
                disabled={isDisabled}
                optionsSourceLabel={optionsSourceLabel}
              />
              <span className="text-muted-foreground shrink-0">→</span>
              <SearchableSelect
                options={selectOptions}
                value={m.to || '__empty__'}
                onValueChange={(v) => updateAt(i, { ...m, to: v === '__empty__' ? '' : v })}
                placeholder="To"
                searchPlaceholder="To..."
                className={cn(inlineInputClass, 'flex-1 min-w-[80px]')}
                disabled={isDisabled}
                optionsSourceLabel={optionsSourceLabel}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeAt(i)}
                disabled={isDisabled}
                aria-label="Remove mapping"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center gap-1.5 h-7 text-muted-foreground"
            onClick={append}
            disabled={isDisabled}
          >
            <Plus className="size-3.5" />
            Add mapping
          </Button>
        </div>
      )
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                inlineInputClass,
                'w-full text-left px-2 py-1.5 rounded-md border border-transparent hover:border-input hover:bg-muted/50 transition-colors',
                className
              )}
              disabled={isDisabled}
            >
              <span className="truncate block">{summary}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start" sideOffset={4}>
            {editor}
          </PopoverContent>
        </Popover>
      )
    }
    case 'link':
    case 'url':
      return (
        <Input
          type={type === 'url' ? 'url' : 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          autoFocus={autoFocus}
          disabled={isDisabled}
        />
      )
    case 'email':
      return (
        <Input
          type="email"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          autoFocus={autoFocus}
          disabled={isDisabled}
        />
      )
    case 'phone':
      return (
        <Input
          type="tel"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          autoFocus={autoFocus}
          disabled={isDisabled}
        />
      )
    case 'status': {
      const selectValue = (value === '' || value == null) ? '__empty__' : String(value)
      return (
        <SearchableSelect
          options={statusOptions.length > 0 ? statusOptions : selectOptions}
          value={selectValue}
          onValueChange={(v) => onChange(v === '__empty__' ? '' : v)}
          placeholder=""
          searchPlaceholder=""
          className={cn(
            inlineInputClass,
            className,
            "text-left px-2 border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 h-full w-full"
          )}
          disabled={isDisabled}
          optionsSourceLabel={optionsSourceLabel}
        />
      )
    }
    case 'rating': {
      const maxRating = typeof config?.ratingMax === 'number' ? config.ratingMax : (typeof config?.max === 'number' ? config.max : 5)
      const minRating = typeof config?.min === 'number' ? config.min : 0
      const step =
        typeof config?.numberStep === 'number'
          ? config.numberStep
          : (config?.ratingAllowHalf ? 0.5 : 1)
      return (
        <Input
          type="number"
          min={minRating}
          max={maxRating}
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          autoFocus={autoFocus}
          disabled={isDisabled}
        />
      )
    }
    case 'person': {
      if (config?.personAllowMultiple) {
        const current = Array.isArray(value)
          ? value.map((v) => String(v))
          : String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean)
        return (
          <MultiSelect
            options={options ?? []}
            value={current}
            onChange={onChange}
            isInline={!formField}
            className={formField ? cn(className, 'w-full text-left shadow-none dark:bg-transparent') : cn(inlineInputClass, className)}
            disabled={isDisabled}
            optionsSourceLabel={optionsSourceLabel}
          />
        )
      }
      return (
        <Input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
          autoFocus={autoFocus}
          disabled={isDisabled}
        />
      )
    }
    case 'files': {
      const textValue = Array.isArray(value)
        ? value.map((entry) => String(entry)).join('\n')
        : String(value ?? '')
      return (
        <Textarea
          value={textValue}
          onChange={(e) =>
            onChange(
              e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
            )
          }
          className={cn(
            inlineInputClass,
            'py-1',
            compact ? 'min-h-0 h-10 resize-none overflow-auto' : 'min-h-[64px]',
            className
          )}
          autoFocus={autoFocus}
          disabled={isDisabled}
          placeholder="One file URL or name per line"
        />
      )
    }
    case 'currency':
    case 'percentage':
      return wrapWithPrefix(
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, withPrefixLeftPadding, className)}
          autoFocus={autoFocus}
          disabled={isDisabled}
        />
      )
    default:
      return <span className="px-2">{String(value)}</span>
  }
}
