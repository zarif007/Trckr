'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, Check } from 'lucide-react'
import type React from 'react'
import { useCallback } from 'react'

export interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  /** Optional: number of fields, used for header description. */
  fieldCount?: number
  /** Disable the primary action button when true. */
  disableSubmit?: boolean
  /** Optional: "add" vs "edit" mode for different accents and icon. */
  mode?: 'add' | 'edit'
  /** Called when the primary action is triggered (button or Enter key). */
  onSubmit: () => void
  /** Called when the "submit & continue" shortcut is triggered (Shift+Enter). */
  onSubmitAndContinue?: () => void
  /** Called when the dialog is cancelled (button or Escape key). */
  onCancel: () => void
  children: React.ReactNode
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  fieldCount,
  disableSubmit,
  mode = 'add',
  onSubmit,
  onSubmitAndContinue,
  onCancel,
  children,
}: FormDialogProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Topmost dialog handles the key so nested dialogs (e.g. Add option) win over parent (Add entry).
        e.stopPropagation()
        if (e.shiftKey) {
          if (!disableSubmit && onSubmitAndContinue) {
            e.preventDefault()
            onSubmitAndContinue()
          } else if (!disableSubmit) {
            // No "add another" — treat Shift+Enter as submit so the topmost dialog executes.
            e.preventDefault()
            onSubmit()
          }
        } else {
          e.preventDefault()
          if (!disableSubmit) onSubmit()
        }
        return
      }
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        onCancel()
      }
    },
    [disableSubmit, onSubmit, onSubmitAndContinue, onCancel]
  )

  const Description = () => {
    if (typeof fieldCount !== 'number') return null
    return (
      <DialogDescription className="text-xs text-muted-foreground">
        {fieldCount} field{fieldCount !== 1 ? 's' : ''} · Press{' '}
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          Enter
        </kbd>{' '}
        to save,{' '}
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          Esc
        </kbd>{' '}
        to cancel
        {onSubmitAndContinue && (
          <>
            ,{' '}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Shift
            </kbd>{' '}
            +{' '}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>{' '}
            to save &amp; add another
          </>
        )}
      </DialogDescription>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[540px] p-0 gap-0 overflow-hidden border-border/60"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
      >
        {/* Header with accent bar */}
        <div
          className={cn(
            'relative px-6 pt-6 pb-4',
            mode === 'add'
              ? 'bg-gradient-to-br from-primary/5 via-transparent to-transparent'
              : 'bg-gradient-to-br from-muted/30 via-transparent to-transparent'
          )}
        >
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-[3px] rounded-t-lg',
              mode === 'add' ? 'bg-primary' : 'bg-muted-foreground/40'
            )}
          />
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {title}
            </DialogTitle>
            <Description />
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[55vh] overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        <DialogFooter className="flex flex-row justify-end gap-2 px-6 py-4 border-t border-border/40 bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="min-w-[80px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={disableSubmit}
            className={cn(
              'min-w-[100px] font-medium transition-all'
            )}
          >
            {mode === 'add' ? (
              <Plus className="h-4 w-4 mr-1.5" />
            ) : (
              <Check className="h-4 w-4 mr-1.5" />
            )}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

