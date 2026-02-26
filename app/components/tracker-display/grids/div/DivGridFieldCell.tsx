'use client'

import { memo } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { DivGridFieldCellProps } from './types'
import { ADD_OPTION_VALUE } from './constants'

/**
 * Focus the first interactive element inside a container.
 * Used on the field wrapper so that clicking the border/padding area
 * immediately activates the input rather than requiring a second click.
 */
function focusInputInContainer(container: HTMLElement) {
  const input = container.querySelector<HTMLElement>(
    'input, textarea, [role="combobox"], [role="listbox"]'
  )
  if (input && document.activeElement !== input) {
    input.focus()
  }
}

export const DivGridFieldCell = memo(function DivGridFieldCell({
  field,
  value,
  valueString,
  options = [],
  showError,
  validationError,
  isDisabled,
  inputTextClass,
  wrapperClassName,
  onUpdate,
  onUpdateWithTouched,
  onSelectChange,
  openAddOption,
  datePickerOpen,
  onDatePickerOpenChange,
}: DivGridFieldCellProps) {
  const fieldId = field.id
  const fieldLabel = field.ui.label
  const opts = options ?? []

  const toItemValue = (v: unknown) => {
    const s = String(v ?? '').trim()
    return s === '' ? '__empty__' : s
  }
  const selectOptions = opts.map((option) => ({
    value: toItemValue(option.value ?? option.id ?? option.label),
    label: option.label,
  }))
  const multiOpts = opts.map((o) => ({ label: o.label, id: String(o.value ?? o.id ?? o.label) }))

  const renderInput = () => {
    switch (field.dataType) {
      case 'text':
        return (
          <Textarea
            className={`min-h-[100px] leading-7 text-foreground/90 border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
            value={valueString}
            placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
            disabled={isDisabled}
            onChange={(e) => onUpdate(fieldId, e.target.value)}
            onBlur={(e) => onUpdateWithTouched(fieldId, e.target.value)}
          />
        )
      case 'boolean':
        return (
          <div className="flex items-center min-h-[2.5rem]">
            <Checkbox
              checked={value === true}
              disabled={isDisabled}
              onCheckedChange={(checked) => onUpdateWithTouched(fieldId, checked)}
            />
          </div>
        )
      case 'options':
        return (
          <SearchableSelect
            options={selectOptions}
            value={typeof value === 'string' && value !== '' && value.trim() !== '' ? value : '__empty__'}
            disabled={isDisabled}
            onValueChange={(val) => {
              if (val === ADD_OPTION_VALUE) {
                openAddOption(fieldId, value)
                return
              }
              onSelectChange(fieldId, val === '__empty__' ? '' : val)
            }}
            searchPlaceholder={`Select ${fieldLabel.toLowerCase()}...`}
            className={`w-full border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
            onAddOptionClick={() => openAddOption(fieldId, value)}
            addOptionLabel="Add option..."
          />
        )
      case 'multiselect':
        return (
          <MultiSelect
            options={multiOpts}
            value={Array.isArray(value) ? value.map(String) : []}
            onChange={(val) => onSelectChange(fieldId, val)}
            disabled={isDisabled}
            className={`w-full border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
            onAddOptionClick={() => openAddOption(fieldId, value)}
          />
        )
      case 'dynamic_select': {
        const selectValue = (value === '' || value == null) ? '__empty__' : String(value)
        return (
          <SearchableSelect
            options={selectOptions}
            value={selectValue}
            disabled={isDisabled}
            onValueChange={(val) => onSelectChange(fieldId, val === '__empty__' ? '' : val)}
            searchPlaceholder={`Select ${fieldLabel.toLowerCase()}...`}
            className={`w-full border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
          />
        )
      }
      case 'dynamic_multiselect':
        return (
          <MultiSelect
            options={multiOpts}
            value={Array.isArray(value) ? value.map(String) : []}
            onChange={(val) => onSelectChange(fieldId, val)}
            disabled={isDisabled}
            className={`w-full border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
          />
        )
      case 'date':
        return (
          <Popover modal open={datePickerOpen} onOpenChange={onDatePickerOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`w-full text-left flex items-center border-0 bg-transparent focus-visible:ring-0 rounded-md py-2 px-3 min-h-9 ${inputTextClass} ${!value ? 'text-muted-foreground' : ''}`}
                disabled={isDisabled}
              >
                {value ? format(new Date(String(value)), 'PPP') : <span>Pick a date</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[60]" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(String(value)) : undefined}
                onSelect={(selected) => {
                  if (isDisabled) return
                  if (selected instanceof Date) {
                    const d = new Date(selected)
                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
                    onUpdateWithTouched(fieldId, d.toISOString())
                  }
                }}
                onCloseRequest={() => onDatePickerOpenChange(false)}
                disabled={(date) => date > new Date('2100-01-01') || date < new Date('1900-01-01')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )
      case 'number': {
        const numValue = typeof value === 'number' ? value : valueString
        return (
          <Input
            type="number"
            className={`border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
            value={numValue === '' ? '' : numValue}
            placeholder="0"
            disabled={isDisabled}
            onChange={(e) => {
              const raw = e.target.value
              onUpdate(fieldId, raw === '' ? undefined : Number(raw))
            }}
            onBlur={(e) =>
              onUpdateWithTouched(fieldId, e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        )
      }
      default:
        return (
          <Input
            className={`border-0 bg-transparent focus-visible:ring-0 rounded-md ${inputTextClass}`}
            value={valueString}
            placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
            disabled={isDisabled}
            onChange={(e) => onUpdate(fieldId, e.target.value)}
            onBlur={(e) => onUpdateWithTouched(fieldId, e.target.value)}
          />
        )
    }
  }

  return (
    <div className="space-y-1 min-w-0">
      <div
        className={`min-w-0 rounded-lg border bg-muted/30 focus-within:bg-background transition-colors hover:border-ring focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 ${wrapperClassName} ${showError ? 'border-destructive/60 ring-1 ring-destructive/40' : 'border-input'}`}
        title={showError ? validationError ?? undefined : undefined}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => focusInputInContainer(e.currentTarget)}
      >
        {renderInput()}
      </div>
      {showError && validationError ? (
        <p className="text-xs text-destructive" role="alert">
          {validationError}
        </p>
      ) : null}
    </div>
  )
})
