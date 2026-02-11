'use client'

import { useState, useRef, useMemo } from 'react'
import { Input } from '@/components/ui/input'
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
import { DEFAULT_INPUT_FONT_CLASS } from '@/lib/style-utils'
import { MultiSelect } from '@/components/ui/multi-select'
import { EntryFormDialog } from './entry-form-dialog'

interface DataTableInputProps {
  value: any
  /** Second param optional: when adding an option, pass { bindingUpdates } so dialog can auto-populate dependent fields. */
  onChange: (value: any, options?: OnChangeOptions) => void
  type: FieldType
  options?: (string | { id: string; label: string })[]
  config?: FieldConfig | null
  className?: string
  autoFocus?: boolean
  /** Fields to show in the Add Option form (columns of the options grid). When set with onAddOption, dialog collects all values. */
  optionsGridFields?: OptionsGridFieldDef[]
  /** When set, select/multiselect shows "Add option". Pass full row; returns the new option value for the select. */
  onAddOption?: (row: Record<string, unknown>) => string
  /** When adding an option, compute binding updates from the new row (for auto-populate in Add Entry dialog). */
  getBindingUpdatesFromRow?: (row: Record<string, unknown>) => Record<string, unknown>
  /** When true, used inside a form (e.g. add/edit dialog); multiselect uses same styling as normal select. */
  formField?: boolean
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
  onAddOption,
  optionsGridFields,
  getBindingUpdatesFromRow,
  formField = false,
}: DataTableInputProps) {
  const inlineInputClass = `border-0 bg-transparent dark:bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 h-full px-2 w-full rounded-none transition-colors ${DEFAULT_INPUT_FONT_CLASS} font-normal`

  const [addOptionOpen, setAddOptionOpen] = useState(false)
  const addOptionModeRef = useRef<'select' | 'multiselect'>('select')

  const addOptionFieldMetadata: FieldMetadata = useMemo(() => {
    const meta: FieldMetadata = {}
    optionsGridFields?.forEach((f) => {
      meta[f.id] = { name: f.label, type: f.type, config: f.config }
    })
    return meta
  }, [optionsGridFields])

  const addOptionFieldOrder = useMemo(
    () => optionsGridFields?.map((f) => f.id) ?? [],
    [optionsGridFields]
  )

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
      const selectOptions = (options ?? []).map((option) => {
        const optValueRaw = typeof option === 'string' ? option : option.id
        const optLabel = typeof option === 'string' ? option : option.label
        const optValue = (typeof optValueRaw === 'string' ? optValueRaw : String(optValueRaw ?? optLabel ?? '')).trim() || '__empty__'
        return { value: optValue, label: optLabel }
      })
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
            onAddOptionClick={onAddOption ? () => openAddOptionDialog('select') : undefined}
            addOptionLabel="Add option..."
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
    case 'multiselect':
      return (
        <>
          <MultiSelect
            options={options ?? []}
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            isInline={!formField}
            className={formField ? cn(className, 'w-full text-left shadow-none') : cn(inlineInputClass, className)}
            onAddOptionClick={onAddOption ? () => openAddOptionDialog('multiselect') : undefined}
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
    case 'link':
      return (
        <Input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inlineInputClass, className)}
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
