'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  LayoutList,
  Table2,
  LayoutGrid,
  FormInput,
  Type,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
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
 * Block inserter button.
 * Always visible as a muted "+ Add block" button.
 * Clicking opens a command palette to pick a block type.
 */
export function BlockCommandInput({
  onAddSection,
  onAddTable,
  onAddKanban,
  onAddForm,
  onAddField,
  className,
}: BlockCommandInputProps) {
  const [open, setOpen] = useState(false)

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

  const handleSelect = useCallback((item: BlockCommandItem) => {
    item.onSelect()
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (commands.length === 0) return null

  return (
    <div className={cn('py-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
              'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50',
              open && 'text-muted-foreground bg-muted/50',
            )}
            aria-label="Add block"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add block</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-64 p-0"
          sideOffset={4}
        >
          <Command
            className="rounded-md border-0"
            shouldFilter={true}
            filter={(value, search) => {
              if (!search) return 1
              const v = value.toLowerCase()
              const s = search.toLowerCase().replace(/^\//, '').trim()
              if (!s) return 1
              return v.includes(s) ? 1 : 0
            }}
          >
            <CommandInput
              placeholder="Search blocks..."
              autoFocus
              className="border-0 border-b rounded-t-md h-9 text-sm"
            />
            <CommandList className="max-h-[240px]">
              <CommandEmpty>No block found.</CommandEmpty>
              <CommandGroup>
                {commands.map((item) => {
                  const Icon = item.icon
                  const keywords = item.keywords.join(' ')
                  return (
                    <CommandItem
                      key={item.id}
                      value={`${item.label} ${keywords}`}
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
