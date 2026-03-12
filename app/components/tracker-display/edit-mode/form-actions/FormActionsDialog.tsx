'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { TrackerFormAction } from '../../types'

function createActionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `action_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export interface FormActionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: TrackerFormAction[]
  onSave: (next: TrackerFormAction[]) => void
}

export function FormActionsDialog({
  open,
  onOpenChange,
  actions,
  onSave,
}: FormActionsDialogProps) {
  const [draft, setDraft] = useState<TrackerFormAction[]>(actions ?? [])

  useEffect(() => {
    if (open) setDraft(actions ?? [])
  }, [open, actions])

  const addAction = useCallback(() => {
    setDraft((prev) => [
      ...prev,
      { id: createActionId(), label: '', statusTag: '', isEditable: true },
    ])
  }, [])

  const updateAction = useCallback((id: string, patch: Partial<TrackerFormAction>) => {
    setDraft((prev) => prev.map((action) => (action.id === id ? { ...action, ...patch } : action)))
  }, [])

  const removeAction = useCallback((id: string) => {
    setDraft((prev) => prev.filter((action) => action.id !== id))
  }, [])

  const hasInvalid = useMemo(
    () => draft.some((action) => !action.label.trim() || !action.statusTag.trim()),
    [draft]
  )

  const handleSave = useCallback(() => {
    const normalized = draft
      .map((action) => ({
        ...action,
        label: action.label.trim(),
        statusTag: action.statusTag.trim(),
      }))
      .filter((action) => action.label && action.statusTag)
    onSave(normalized)
    onOpenChange(false)
  }, [draft, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Form Actions</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {draft.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No actions yet. Add buttons like Draft, Saved, Submitted, or Cancelled.
            </p>
          )}
          {draft.map((action) => (
            <div
              key={action.id}
              className="rounded-md border border-border/60 p-3 grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr_auto]"
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Button Name
                </label>
                <Input
                  value={action.label}
                  onChange={(e) => updateAction(action.id, { label: e.target.value })}
                  placeholder="e.g. Submit"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status Tag
                </label>
                <Input
                  value={action.statusTag}
                  onChange={(e) => updateAction(action.id, { statusTag: e.target.value })}
                  placeholder="e.g. Submitted"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={action.isEditable}
                    onCheckedChange={(checked) => updateAction(action.id, { isEditable: checked === true })}
                  />
                  Editable
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAction(action.id)}
                  aria-label="Remove action"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={addAction} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add action
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Actions with “Editable” off will lock the form.
          </p>
        </div>
        <DialogFooter className="pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={hasInvalid}>
            Save actions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
