'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrackerFieldType } from '../types'
import type { AddColumnOrFieldDialogProps } from './types'
import { getCreatableFieldTypesWithLabels } from './utils'

/**
 * Dialog to add a new column (table) or field (div): create new or add existing.
 * Used by both TrackerTableGrid and TrackerDivGrid via the edit-mode module.
 */
export function AddColumnOrFieldDialog({
  open,
  onOpenChange,
  variant,
  existingFieldIds,
  allFields,
  onConfirm,
}: AddColumnOrFieldDialogProps) {
  const [newLabel, setNewLabel] = useState('')
  const [newDataType, setNewDataType] = useState<TrackerFieldType>('string')
  const [existingFieldId, setExistingFieldId] = useState<string>('')
  const [labelTouched, setLabelTouched] = useState(false)

  const existingSet = new Set(existingFieldIds)
  const availableFields = allFields.filter((f) => !existingSet.has(f.id))
  const typeOptions = getCreatableFieldTypesWithLabels()
  const labelName = variant === 'column' ? 'Column' : 'Field'

  const canSubmit = existingFieldId.length > 0 || newLabel.trim().length > 0
  const labelInvalid = labelTouched && !existingFieldId && !newLabel.trim()
  const labelError = labelInvalid
    ? `${labelName} name is required unless you select an existing one`
    : null

  const handleSubmit = () => {
    if (!canSubmit) return
    if (existingFieldId) {
      onConfirm({ mode: 'existing', fieldId: existingFieldId })
    } else {
      onConfirm({ mode: 'new', label: newLabel.trim(), dataType: newDataType })
    }
    setNewLabel('')
    setNewDataType('string')
    setExistingFieldId('')
    setLabelTouched(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setNewLabel('')
    setNewDataType('string')
    setExistingFieldId('')
    setLabelTouched(false)
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) setLabelTouched(false)
    onOpenChange(next)
  }

  // Group type options by group for the select
  const groupedTypes = typeOptions.reduce<Record<string, typeof typeOptions>>(
    (acc, opt) => {
      const g = opt.group ?? 'Other'
      if (!acc[g]) acc[g] = []
      acc[g].push(opt)
      return acc
    },
    {}
  )
  const groupOrder = ['Text', 'Numbers', 'Date & time', 'Choice', 'Other']

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
        onOpenAutoFocus={(e) => {
          const input = document.getElementById('new-label') as HTMLInputElement | null
          if (input) {
            e.preventDefault()
            input.focus()
          }
        }}
      >
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-primary/8 via-background to-background">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary/80" />
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Add {labelName}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Choose an existing {labelName.toLowerCase()} or define a new one in a single flow.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="existing-field"
                className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
              >
                Existing {labelName.toLowerCase()} (optional)
              </label>
              <Select
                value={existingFieldId}
                onValueChange={(value) => {
                  setExistingFieldId(value)
                  if (value) {
                    setLabelTouched(false)
                  }
                }}
              >
                <SelectTrigger
                  id="existing-field"
                  className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                >
                  <SelectValue placeholder={`Select a ${labelName.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.length === 0 ? (
                    <div className="mx-1 my-2 rounded-md border border-dashed border-border/60 bg-muted/30 py-6 text-center text-sm text-muted-foreground">
                      No other {labelName.toLowerCase()}s to add
                    </div>
                  ) : (
                    availableFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.ui.label} ({f.dataType})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
                <span className="bg-background px-2 text-muted-foreground">or create new</span>
              </div>
            </div>
            <div className={cn('space-y-5', existingFieldId && 'opacity-55')}>
              <div className="space-y-2">
                <label
                  htmlFor="new-label"
                  className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                >
                  Label
                </label>
                <Input
                  id="new-label"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value)
                    if (e.target.value.trim()) {
                      setExistingFieldId('')
                    }
                  }}
                  onBlur={() => setLabelTouched(true)}
                  placeholder={variant === 'column' ? 'e.g. Status' : 'e.g. Description'}
                  className={cn(
                    'h-10 w-full rounded-lg border-border/60 bg-background/90',
                    labelInvalid && 'border-destructive focus-visible:ring-destructive/20'
                  )}
                  aria-invalid={labelInvalid}
                  aria-describedby={labelError ? 'new-label-error' : undefined}
                />
                {labelError && (
                  <p id="new-label-error" className="text-xs text-destructive mt-1">
                    {labelError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="new-type"
                  className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                >
                  Type
                </label>
                <Select
                  value={newDataType}
                  onValueChange={(v) => setNewDataType(v as TrackerFieldType)}
                  disabled={Boolean(existingFieldId)}
                >
                  <SelectTrigger
                    id="new-type"
                    className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOrder.map(
                      (groupKey) =>
                        groupedTypes[groupKey]?.length > 0 && (
                          <SelectGroup key={groupKey}>
                            <SelectLabel className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                              {groupKey}
                            </SelectLabel>
                            {groupedTypes[groupKey].map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button variant="outline" size="sm" onClick={handleCancel} className="min-w-[84px]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="min-w-[104px] gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add {labelName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
