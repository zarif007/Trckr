'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  LayoutList,
  Table2,
  LayoutGrid,
  FormInput,
  type LucideIcon,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
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
  className?: string
  placeholder?: string
}

/**
 * Notion-like slash command input.
 * Click to open, type "/" or search to filter and insert a block.
 * Shows all available block types in a single unified menu.
 */
export function BlockCommandInput({
  onAddSection,
  onAddTable,
  onAddKanban,
  onAddForm,
  className,
  placeholder = 'Type / to add a block…',
}: BlockCommandInputProps) {
  const [open, setOpen] = useState(false)

  const commands = useMemo(() => {
    const items: BlockCommandItem[] = []
    if (onAddSection) {
      items.push({
        id: 'section',
        label: 'Section',
        description: 'Add a new section heading',
        keywords: ['section', 'heading', 'block', 'group'],
        icon: LayoutList,
        onSelect: onAddSection,
      })
    }
    if (onAddTable) {
      items.push({
        id: 'table',
        label: 'Table',
        description: 'Add a data table',
        keywords: ['table', 'grid', 'columns', 'rows', 'data'],
        icon: Table2,
        onSelect: onAddTable,
      })
    }
    if (onAddKanban) {
      items.push({
        id: 'kanban',
        label: 'Kanban',
        description: 'Add a kanban board',
        keywords: ['kanban', 'board', 'cards', 'columns'],
        icon: LayoutGrid,
        onSelect: onAddKanban,
      })
    }
    if (onAddForm) {
      items.push({
        id: 'form',
        label: 'Form',
        description: 'Add a form / div layout',
        keywords: ['form', 'div', 'fields', 'layout', 'input'],
        icon: FormInput,
        onSelect: onAddForm,
      })
    }
    return items
  }, [onAddSection, onAddTable, onAddKanban, onAddForm])

  const handleSelect = useCallback((item: BlockCommandItem) => {
    item.onSelect()
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (commands.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'w-full py-1.5 px-2 text-left text-sm text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
            className
          )}
          aria-label="Add block"
        >
          <span>{placeholder}</span>
        </button>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-72 p-0"
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
            placeholder="Search blocks…"
            autoFocus
            className="border-0 border-b rounded-t-md"
          />
          <CommandList>
            <CommandEmpty>No block found.</CommandEmpty>
            <CommandGroup heading="Blocks">
              {commands.map((item) => {
                const Icon = item.icon
                const keywords = item.keywords.join(' ')
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${keywords}`}
                    onSelect={() => handleSelect(item)}
                    className="gap-2 py-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded border bg-muted/50">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
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
