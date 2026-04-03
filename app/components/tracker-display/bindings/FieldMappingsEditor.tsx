'use client'

import { useMemo, useState } from 'react'
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ListTree } from 'lucide-react'
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
 searchPlaceholder={`Search ${placeholder.toLowerCase()}…`}
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
 const [open, setOpen] = useState(false)

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
 onChange(mappings.filter((_, i) => i !== index))
 }

 const append = () => onChange([...mappings, { from: '', to: '' }])

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger asChild>
 <button
 type="button"
 className={cn(
 'group w-full flex items-center justify-between gap-3 rounded-sm border border-border/80 bg-muted/25 px-3 py-2.5 text-left transition-colors hover:bg-muted/45 hover:border-border',
 className
 )}
 disabled={disabled}
 >
 <span className="flex min-w-0 items-center gap-2">
 <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-background/80 text-muted-foreground ring-1 ring-border/60 group-hover:text-foreground">
 <ListTree className="size-4" aria-hidden />
 </span>
 <span className="min-w-0">
 <span className="block truncate text-sm font-medium text-foreground">{summary}</span>
 <span className="block text-[11px] text-muted-foreground">Map master data columns to this grid</span>
 </span>
 </span>
 <span className="shrink-0 rounded-sm bg-background/60 px-2 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border/50 group-hover:text-foreground">
 Edit
 </span>
 </button>
 </DialogTrigger>
 <DialogContent
 showCloseButton
 className="flex max-h-[min(90vh,780px)] w-[calc(100%-1.5rem)] flex-col overflow-hidden p-0 sm:max-w-2xl"
 onOpenAutoFocus={(e) => e.preventDefault()}
 >
 <DialogHeader className="shrink-0 space-y-1.5 border-b border-border/60 px-5 pt-5 pb-4 text-left">
 <DialogTitle className="text-base">Field mappings</DialogTitle>
 <DialogDescription className="text-xs leading-relaxed">
 When someone picks an option in the bound select, values copy from the master data row (left) into
 fields on this grid (right). Use <span className="font-medium text-foreground/90">Auto-map</span> on the
 bindings tab for suggested pairs.
 </DialogDescription>
 </DialogHeader>

 <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
 {mappings.length === 0 ? (
 <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border/70 bg-muted/20 py-12 px-4 text-center">
 <ListTree className="size-8 text-muted-foreground/50" aria-hidden />
 <p className="text-sm text-muted-foreground max-w-sm">
 No mappings yet. Add rows below or run Auto-map to match fields by name.
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="hidden sm:grid sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] sm:gap-x-3 sm:items-end sm:px-1">
 <span className="sr-only">#</span>
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Master data field
 </span>
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 This grid field
 </span>
 <span className="sr-only">Remove</span>
 </div>
 {mappings.map((m, i) => (
 <div
 key={i}
 className={cn(
 'rounded-sm border border-border/60 bg-card/40 p-3 ',
 'sm:border-0 sm:bg-transparent sm:p-0 sm:',
 'sm:grid sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] sm:gap-x-3 sm:items-center'
 )}
 >
 <div
 className="mb-3 flex size-8 items-center justify-center rounded-sm bg-muted/80 text-xs font-semibold text-muted-foreground sm:mb-0"
 aria-hidden
 >
 {i + 1}
 </div>
 <div className="min-w-0 space-y-1.5 sm:space-y-0">
 <label className="sm:sr-only text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
 Master data field
 </label>
 <MappingInput
 value={m.from}
 onChange={(next) => updateAt(i, { ...m, from: next })}
 options={fromOptions}
 placeholder="Choose source…"
 disabled={disabled}
 className="h-10 w-full min-w-0"
 />
 </div>
 <div className="mt-3 min-w-0 space-y-1.5 sm:mt-0 sm:space-y-0">
 <label className="sm:sr-only text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
 This grid field
 </label>
 <MappingInput
 value={m.to}
 onChange={(next) => updateAt(i, { ...m, to: next })}
 options={toOptions}
 placeholder="Choose target…"
 disabled={disabled}
 className="h-10 w-full min-w-0"
 />
 </div>
 <div className="mt-2 flex justify-end sm:mt-0 sm:justify-center">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="size-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
 onClick={() => removeAt(i)}
 disabled={disabled}
 aria-label={`Remove mapping ${i + 1}`}
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="shrink-0 border-t border-border/60 bg-muted/20 px-5 py-4">
 <Button
 type="button"
 variant="default"
 size="sm"
 className="h-10 w-full gap-2 sm:w-auto sm:min-w-[160px]"
 onClick={append}
 disabled={disabled}
 >
 <Plus className="size-4" />
 Add mapping
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 )
}
