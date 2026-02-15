'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TrackerField, TrackerFieldType } from '../types'
import type { AddColumnOrFieldDialogProps } from './types'
import { getSimpleFieldTypes } from './utils'

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
  const [choice, setChoice] = useState<'new' | 'existing'>('new')
  const [newLabel, setNewLabel] = useState('')
  const [newDataType, setNewDataType] = useState<TrackerFieldType>('string')
  const [existingFieldId, setExistingFieldId] = useState<string>('')

  const existingSet = new Set(existingFieldIds)
  const availableFields = allFields.filter((f) => !existingSet.has(f.id))
  const simpleTypes = getSimpleFieldTypes()

  const canSubmit =
    choice === 'new'
      ? newLabel.trim().length > 0
      : existingFieldId.length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    if (choice === 'new') {
      onConfirm({ mode: 'new', label: newLabel.trim(), dataType: newDataType })
    } else {
      onConfirm({ mode: 'existing', fieldId: existingFieldId })
    }
    setNewLabel('')
    setNewDataType('string')
    setExistingFieldId('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setNewLabel('')
    setExistingFieldId('')
    onOpenChange(false)
  }

  const labelName = variant === 'column' ? 'Column' : 'Field'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] gap-4 border-border/60">
        <DialogHeader>
          <DialogTitle>Add {labelName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setChoice('new')}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                choice === 'new'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              Create new
            </button>
            <button
              type="button"
              onClick={() => setChoice('existing')}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                choice === 'existing'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              Add existing
            </button>
          </div>
          {choice === 'new' ? (
            <>
              <div className="space-y-2">
                <label htmlFor="new-label" className="text-sm font-medium text-foreground">
                  Label
                </label>
                <Input
                  id="new-label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={`e.g. ${variant === 'column' ? 'Status' : 'Description'}`}
                  className="input-field-height"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-type" className="text-sm font-medium text-foreground">
                  Type
                </label>
                <Select
                  value={newDataType}
                  onValueChange={(v) => setNewDataType(v as TrackerFieldType)}
                >
                  <SelectTrigger id="new-type" className="input-field-height">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {simpleTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label htmlFor="existing-field" className="text-sm font-medium text-foreground">
                Existing {labelName.toLowerCase()}
              </label>
              <Select
                value={existingFieldId}
                onValueChange={setExistingFieldId}
              >
                <SelectTrigger id="existing-field" className="input-field-height">
                  <SelectValue placeholder={`Select a ${labelName.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
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
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            Add {labelName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
