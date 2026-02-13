'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  PopoverAnchor,
  Popover,
  PopoverContent,
} from '@/components/ui/popover'

interface MultiSelectProps {
  options: (string | { id: string; label: string })[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  isInline?: boolean
  autoFocus?: boolean
  required?: boolean
  disabled?: boolean
  'aria-invalid'?: boolean
  /** When set, shows "Add option..." in the list; callback is responsible for adding and optionally updating value. */
  onAddOptionClick?: () => void
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = '',
  className = '',
  isInline = false,
  autoFocus = false,
  required = false,
  disabled = false,
  'aria-invalid': ariaInvalid = false,
  onAddOptionClick,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(autoFocus)
  const [searchValue, setSearchValue] = React.useState('')
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  const displayText = value.length > 0
    ? value.map(v => {
      const option = options.find(o => (typeof o === 'string' ? o : o.id) === v)
      return option ? (typeof option === 'string' ? option : option.label) : v
    }).join(', ')
    : placeholder

  const isEmpty = value.length === 0
  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase()
    if (!normalizedQuery) return options
    return options.filter((option) => {
      const optLabel = typeof option === 'string' ? option : option.label
      return optLabel.toLowerCase().includes(normalizedQuery)
    })
  }, [options, searchValue])

  const triggerClasses = cn(
    "input-field-height border-input hover:border-ring [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring ring-0 focus:ring-0 focus-visible:ring-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 font-normal text-left",
    isInline && "!h-full !min-h-0 border-0 bg-transparent shadow-none px-2 focus-visible:ring-0 focus:ring-0",
    className
  )

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearchValue('')
      }}
    >
      <PopoverAnchor asChild>
        <div
          ref={triggerRef}
          className={cn(triggerClasses, open && 'border-ring', 'min-w-0 overflow-hidden')}
          aria-expanded={open}
          aria-required={required}
          aria-invalid={ariaInvalid}
        >
          <input
            value={open ? searchValue : (isEmpty ? '' : displayText)}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setOpen(true)
              setSearchValue(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false)
                setSearchValue('')
              }
              if (e.key === 'Enter') {
                e.preventDefault()
              }
            }}
            placeholder={isEmpty ? placeholder : ''}
            className="min-w-0 flex-1 bg-transparent outline-none border-0 ring-0 text-left"
            disabled={disabled}
          />
          <button
            type="button"
            className="inline-flex items-center"
            onClick={(e) => {
              e.preventDefault()
              if (disabled) return
              setOpen((prev) => !prev)
            }}
            disabled={disabled}
            aria-label="Toggle options"
          >
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="min-w-48 max-w-64 w-[var(--radix-popover-trigger-width)] p-0 z-[60]"
        align="start"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (triggerRef.current?.contains(event.target as Node)) {
            event.preventDefault()
          }
        }}
        onInteractOutside={(event) => {
          if (triggerRef.current?.contains(event.target as Node)) {
            event.preventDefault()
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => {
                const optValue = typeof option === 'string' ? option : option.id
                const optLabel = typeof option === 'string' ? option : option.label
                return (
                  <CommandItem
                    key={optValue}
                    value={optLabel}
                    onSelect={() => handleSelect(optValue)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                        value.includes(optValue)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    {optLabel}
                  </CommandItem>
                )
              })}
              {onAddOptionClick && (
                <CommandItem
                  value="Add option"
                  onSelect={() => onAddOptionClick()}
                  className="cursor-pointer text-muted-foreground border-t border-border/50 mt-1 pt-1"
                >
                  <span className="mr-2">+</span>
                  Add option...
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
