'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  LayoutList,
  Table2,
  LayoutGrid,
  FormInput,
  Type,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { PopoverAnchor, Popover, PopoverContent } from '@/components/ui/popover'
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { cn } from '@/lib/utils'

export interface BlockCommandItem {
  id: string
  label: string
  description: string
  keywords: string[]
  icon: LucideIcon
  onSelect: () => void
}

export interface BlockCommandInputProps {
  onAddSection?: () => void
  onAddTable?: () => void
  onAddKanban?: () => void
  onAddForm?: () => void
  onAddField?: () => void
  className?: string
  placeholder?: string
}

/**
 * Notion-like Add inserter. Same pattern as SearchableSelect:
 * Single input in the trigger; type to search; dropdown shows filtered list only (no second input).
 */
export function BlockCommandInput({
  onAddSection,
  onAddTable,
  onAddKanban,
  onAddForm,
  onAddField,
  className,
  placeholder = 'Add block...',
}: BlockCommandInputProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const triggerRef = useRef<HTMLDivElement>(null)

  const commands = useMemo(() => {
    const items: BlockCommandItem[] = []
    if (onAddSection) {
      items.push({
        id: 'section',
        label: 'Section',
        description: 'A new section heading',
        keywords: ['section', 'heading', 'block', 'group'],
        icon: LayoutList,
        onSelect: onAddSection,
      })
    }
    if (onAddTable) {
      items.push({
        id: 'table',
        label: 'Table',
        description: 'A data table with rows and columns',
        keywords: ['table', 'grid', 'columns', 'rows', 'data'],
        icon: Table2,
        onSelect: onAddTable,
      })
    }
    if (onAddKanban) {
      items.push({
        id: 'kanban',
        label: 'Kanban',
        description: 'A kanban board with columns',
        keywords: ['kanban', 'board', 'cards', 'columns'],
        icon: LayoutGrid,
        onSelect: onAddKanban,
      })
    }
    if (onAddForm) {
      items.push({
        id: 'form',
        label: 'Form',
        description: 'A form / div layout',
        keywords: ['form', 'div', 'fields', 'layout', 'input'],
        icon: FormInput,
        onSelect: onAddForm,
      })
    }
    if (onAddField) {
      items.push({
        id: 'field',
        label: 'Field',
        description: 'A single field (auto-creates form if needed)',
        keywords: ['field', 'column', 'input', 'property', 'attribute'],
        icon: Type,
        onSelect: onAddField,
      })
    }
    return items
  }, [onAddSection, onAddTable, onAddKanban, onAddForm, onAddField])

  const filteredCommands = useMemo(() => {
    const s = searchValue.trim().toLowerCase()
    if (!s) return commands
    return commands.filter((item) => {
      const text = `${item.label} ${item.description} ${item.keywords.join(' ')}`.toLowerCase()
      return text.includes(s)
    })
  }, [commands, searchValue])

  const handleSelect = useCallback((item: BlockCommandItem) => {
    item.onSelect()
    setOpen(false)
    setSearchValue('')
  }, [])

  if (commands.length === 0) return null

  return (
    <div className={cn('w-full min-h-7', className)}>
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
            className={cn(
              'flex items-center gap-2 w-full min-h-7 px-2 py-1.5 rounded-sm text-sm leading-7 transition-colors',
              'text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/40',
              'focus-within:text-foreground focus-within:bg-muted/30',
              open && 'text-foreground bg-muted/30'
            )}
            aria-expanded={open}
          >
            <Plus className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <input
              value={searchValue}
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
                if (e.key === 'Enter') e.preventDefault()
              }}
              placeholder={open ? 'Type to search...' : placeholder}
              className="min-w-0 flex-1 bg-transparent outline-none ring-0 placeholder:text-muted-foreground/60 text-[inherit] leading-inherit"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-64 p-0"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            if (triggerRef.current?.contains(e.target as Node)) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            if (triggerRef.current?.contains(e.target as Node)) e.preventDefault()
          }}
        >
          <Command shouldFilter={false} className="rounded-md border-0">
            <CommandList className="max-h-[240px]">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filteredCommands.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className="gap-2.5 px-2 py-1.5 cursor-pointer"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-muted/70 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-0 min-w-0">
                        <span className="text-sm font-medium leading-tight">{item.label}</span>
                        <span className="text-[11px] text-muted-foreground leading-tight truncate">{item.description}</span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
