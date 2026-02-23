'use client'

import { useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchableSelect } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { FieldMapping } from '@/lib/types/tracker-bindings'
import { cn } from '@/lib/utils'

export interface FieldMappingsEditorProps {
  value: FieldMapping[]
  onChange: (next: FieldMapping[]) => void
  fromOptions: Array<{ value: string; label: string }>
  toOptions: Array<{ value: string; label: string }>
  disabled?: boolean
  className?: string
}

function MappingInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
}: {
  value: string
  onChange: (next: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
  disabled?: boolean
  className?: string
}) {
  if (options.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    )
  }

  return (
    <SearchableSelect
      options={options}
      value={value || '__empty__'}
      onValueChange={(v) => onChange(v === '__empty__' ? '' : v)}
      placeholder={placeholder}
      searchPlaceholder={placeholder}
      className={className}
      disabled={disabled}
    />
  )
}

export function FieldMappingsEditor({
  value,
  onChange,
  fromOptions,
  toOptions,
  disabled,
  className,
}: FieldMappingsEditorProps) {
  const mappings: FieldMapping[] = Array.isArray(value) ? value : []

  const summary = useMemo(() => {
    if (!mappings.length) return 'No mappings'
    return `${mappings.length} mapping${mappings.length === 1 ? '' : 's'}`
  }, [mappings.length])

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full text-left px-2 py-1.5 rounded border border-transparent hover:border-input hover:bg-muted/50 transition-colors',
            className
          )}
          disabled={disabled}
        >
          <span className="truncate block">{summary}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start" sideOffset={4}>
        <div className="flex flex-col gap-1.5 w-full min-w-[280px] max-w-[420px]">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-wrap">
              <MappingInput
                value={m.from}
                onChange={(next) => updateAt(i, { ...m, from: next })}
                options={fromOptions}
                placeholder="From"
                disabled={disabled}
                className="flex-1 min-w-[80px]"
              />
              <span className="text-muted-foreground shrink-0">→</span>
              <MappingInput
                value={m.to}
                onChange={(next) => updateAt(i, { ...m, to: next })}
                options={toOptions}
                placeholder="To"
                disabled={disabled}
                className="flex-1 min-w-[80px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeAt(i)}
                disabled={disabled}
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
            disabled={disabled}
          >
            <Plus className="size-3.5" />
            Add mapping
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
