"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  PopoverAnchor,
  Popover,
  PopoverContent,
} from "@/components/ui/popover"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "input-field-height border-input hover:border-ring [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring ring-0 focus:ring-0 focus-visible:ring-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-1 text-sm whitespace-nowrap transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 data-[size=sm]:h-8 data-[size=sm]:min-h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border",
          position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

type SearchableSelectOption = string | { value: string; label: string }

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  size?: "sm" | "default"
  /** When set, shows "Add option..." at the bottom; callback is responsible for adding the new option. */
  onAddOptionClick?: () => void
  /** Label for the add-option action. Default "Add option..." */
  addOptionLabel?: string
}

function SearchableSelect({
  options,
  value = "",
  onValueChange,
  placeholder = "",
  searchPlaceholder = "",
  emptyMessage = "No results found.",
  className,
  disabled = false,
  size = "default",
  onAddOptionClick,
  addOptionLabel = "Add option...",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const displayLabel = React.useMemo(() => {
    if (!value || value === "__empty__") return null
    const option = options.find(
      (o) => (typeof o === "string" ? o : o.value) === value
    )
    return option ? (typeof option === "string" ? option : option.label) : value
  }, [value, options])

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase()
    if (!normalizedQuery) return options
    return options.filter((option) => {
      const optLabel = typeof option === "string" ? option : option.label
      return optLabel.toLowerCase().includes(normalizedQuery)
    })
  }, [options, searchValue])

  const triggerClassName = cn(
    "input-field-height border-input hover:border-ring [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring ring-0 focus:ring-0 focus-visible:ring-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-1 text-sm whitespace-nowrap transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    size === "sm" && "!h-8 !min-h-8",
    className
  )

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearchValue("")
      }}
    >
      <PopoverAnchor asChild>
        <div
          ref={triggerRef}
          className={cn(triggerClassName, open && 'border-ring', 'min-w-0 overflow-hidden')}
          aria-expanded={open}
        >
          <input
            value={open ? searchValue : (displayLabel ?? "")}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setOpen(true)
              setSearchValue(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false)
                setSearchValue("")
              }
              if (e.key === "Enter") {
                e.preventDefault()
              }
            }}
            placeholder={open ? (searchPlaceholder || placeholder) : placeholder}
            className="min-w-0 flex-1 bg-transparent outline-none border-0 ring-0"
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
            <ChevronDownIcon className="size-4 opacity-50" />
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
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => {
                const optValue = typeof option === "string" ? option : option.value
                const optLabel = typeof option === "string" ? option : option.label
                const handleSelect = () => {
                  setOpen(false)
                  setSearchValue("")
                  onValueChange?.(optValue)
                }
                return (
                  <CommandItem
                    key={optValue}
                    value={optLabel}
                    onSelect={handleSelect}
                    onPointerDown={(e) => {
                      // Ensure first click closes and selects (cmdk onSelect can miss first click in portals)
                      if (e.button === 0) {
                        e.preventDefault()
                        handleSelect()
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <span
                      data-slot="select-item-indicator"
                      className="mr-2 flex size-3.5 items-center justify-center"
                    >
                      {value === optValue ? (
                        <CheckIcon className="size-4" />
                      ) : null}
                    </span>
                    {optLabel}
                  </CommandItem>
                )
              })}
              {onAddOptionClick && (
                <CommandItem
                  value={addOptionLabel}
                  onSelect={() => {
                    setOpen(false)
                    setSearchValue("")
                    onAddOptionClick()
                  }}
                  onPointerDown={(e) => {
                    if (e.button === 0) {
                      e.preventDefault()
                      setOpen(false)
                      setSearchValue("")
                      onAddOptionClick()
                    }
                  }}
                  className="cursor-pointer text-muted-foreground border-t border-border/50 mt-1 pt-1"
                >
                  <Plus className="mr-2 size-3.5" />
                  {addOptionLabel}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export {
  SearchableSelect,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
export type { SearchableSelectOption, SearchableSelectProps }
