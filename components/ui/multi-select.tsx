'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface MultiSelectProps {
  options: (string | { id: string; label: string })[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  isInline?: boolean
  autoFocus?: boolean
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Select options...',
  className = '',
  isInline = false,
  autoFocus = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(autoFocus)

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  // Use space separated values for display as requested
  const displayText = value.length > 0 
    ? value.map(v => {
        const option = options.find(o => (typeof o === 'string' ? o : o.id) === v)
        return option ? (typeof option === 'string' ? option : option.label) : v
      }).join(' ') 
    : placeholder

  const triggerClasses = cn(
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9",
    isInline && "h-full border-0 bg-transparent shadow-none px-2 focus-visible:ring-0 focus:ring-0",
    className
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClasses}
          aria-expanded={open}
        >
          <span className="truncate flex-1 text-left">{displayText}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[60]" align="start">
        <Command>
          <CommandInput placeholder="Search..." className="h-8" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const optValue = typeof option === 'string' ? option : option.id
                const optLabel = typeof option === 'string' ? option : option.label
                return (
                  <CommandItem
                    key={optValue}
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
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
