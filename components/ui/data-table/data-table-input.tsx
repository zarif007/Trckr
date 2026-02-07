'use client'

import { useState, useRef } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { FieldType, FieldConfig, type OptionsGridFieldDef } from './utils'
import { cn } from '@/lib/utils'
import { MultiSelect } from '@/components/ui/multi-select'
import { Plus } from 'lucide-react'

export function AddOptionFieldInput({
  field,
  value,
  onChange,
}: {
  field: OptionsGridFieldDef
  value: unknown
  onChange: (value: unknown) => void
}) {
  const v = value ?? ''
  switch (field.type) {
    case 'number':
    case 'currency':
    case 'percentage':
      return (
        <Input
          type="number"
          value={typeof v === 'number' ? v : v === '' ? '' : String(v)}
          onChange={(e) => {
            const x = e.target.value
            onChange(x === '' ? undefined : Number(x))
          }}
          placeholder={field.label}
          className="h-9"
        />
      )
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={v === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <span className="text-sm text-muted-foreground">{field.label}</span>
        </div>
      )
    case 'text':
      return (
        <Textarea
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          className="min-h-[60px]"
        />
      )
    case 'date':
      return (
        <Input
          type="date"
          value={typeof v === 'string' && v ? new Date(v).toISOString().split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="h-9"
        />
      )
    default:
      return (
        <Input
          type="text"
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          className="h-9"
        />
      )
  }
}

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
}: DataTableInputProps) {
  const inlineInputClass =
    'border-0 bg-transparent dark:bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 h-full px-2 w-full text-[13px] font-normal rounded-none transition-colors'

  const [addOptionOpen, setAddOptionOpen] = useState(false)
  const [addOptionRow, setAddOptionRow] = useState<Record<string, unknown>>({})
  const addOptionModeRef = useRef<'select' | 'multiselect'>('select')

  const openAddOptionDialog = (mode: 'select' | 'multiselect') => {
    addOptionModeRef.current = mode
    const initial: Record<string, unknown> = {}
    optionsGridFields?.forEach((f) => {
      initial[f.id] = f.type === 'number' ? '' : f.type === 'boolean' ? false : ''
    })
    setAddOptionRow(initial)
    setAddOptionOpen(true)
  }

  const setAddOptionField = (fieldId: string, fieldValue: unknown) => {
    setAddOptionRow((prev) => ({ ...prev, [fieldId]: fieldValue }))
  }

  const confirmAddOption = () => {
    if (!onAddOption) return
    const row = { ...addOptionRow }
    optionsGridFields?.forEach((f) => {
      if (row[f.id] === '' && (f.type === 'number' || f.type === 'string')) row[f.id] = f.type === 'number' ? undefined : ''
    })
    const newValue = onAddOption(row)
    const bindingUpdates = getBindingUpdatesFromRow?.(row) ?? {}
    if (addOptionModeRef.current === 'multiselect') {
      const current = Array.isArray(value) ? value : []
      onChange([...current, newValue], { bindingUpdates })
    } else {
      onChange(newValue, { bindingUpdates })
    }
    setAddOptionOpen(false)
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
      return (
        <>
          <Select
            value={selectValue}
            onValueChange={(v) => {
              if (v === ADD_OPTION_VALUE) {
                openAddOptionDialog('select')
                return
              }
              onChange(v === '__empty__' ? '' : v)
            }}
          >
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
              {onAddOption && (
                <SelectItem value={ADD_OPTION_VALUE} className="text-muted-foreground border-t border-border/50">
                  <Plus className="h-3.5 w-3.5 mr-1.5 inline" />
                  Add option...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {onAddOption && (
            <Dialog open={addOptionOpen} onOpenChange={setAddOptionOpen}>
              <DialogContent className="sm:max-w-[400px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Add option</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  {optionsGridFields?.map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      {f.type !== 'boolean' && (
                        <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                      )}
                      <AddOptionFieldInput
                        field={f}
                        value={addOptionRow[f.id]}
                        onChange={(val) => setAddOptionField(f.id, val)}
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setAddOptionOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={confirmAddOption}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            isInline={true}
            className={cn(inlineInputClass, className)}
            onAddOptionClick={onAddOption ? () => openAddOptionDialog('multiselect') : undefined}
          />
          {onAddOption && (
            <Dialog open={addOptionOpen} onOpenChange={setAddOptionOpen}>
              <DialogContent className="sm:max-w-[400px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Add option</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  {optionsGridFields?.map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      {f.type !== 'boolean' && (
                        <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                      )}
                      <AddOptionFieldInput
                        field={f}
                        value={addOptionRow[f.id]}
                        onChange={(val) => setAddOptionField(f.id, val)}
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setAddOptionOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={confirmAddOption}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
