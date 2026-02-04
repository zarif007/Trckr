'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getValidationError, sanitizeValue, getFieldIcon, type FieldMetadata } from './utils'
import { DataTableInput } from './data-table-input'
import { cn } from '@/lib/utils'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { Plus, Check } from 'lucide-react'

export interface EntryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  fieldMetadata: FieldMetadata
  /** Field ids in display order. If not provided, uses Object.keys(fieldMetadata). */
  fieldOrder?: string[]
  initialValues: Record<string, unknown>
  onSave: (values: Record<string, unknown>) => void
  /** When a select/multiselect field changes, return extra field updates (e.g. from bindings) to merge into form. */
  getBindingUpdates?: (fieldId: string, value: unknown) => Record<string, unknown>
  /** Optional: "add" vs "edit" mode for different accents */
  mode?: 'add' | 'edit'
}

export function EntryFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  fieldMetadata,
  fieldOrder,
  initialValues,
  onSave,
  getBindingUpdates,
  mode = 'add',
}: EntryFormDialogProps) {
  const orderedIds = fieldOrder ?? Object.keys(fieldMetadata)
  const [formData, setFormData] = useState<Record<string, unknown>>(initialValues)

  useEffect(() => {
    if (open) {
      setFormData(initialValues)
    }
  }, [open, initialValues])

  const hasError = useMemo(() => {
    return orderedIds.some((columnId) => {
      const fieldInfo = fieldMetadata[columnId]
      if (!fieldInfo) return false
      return !!getValidationError(
        formData[columnId],
        fieldInfo.type,
        fieldInfo.config
      )
    })
  }, [formData, fieldMetadata, orderedIds])

  const handleSave = useCallback(() => {
    onSave(formData)
    setFormData({})
    onOpenChange(false)
  }, [formData, onSave, onOpenChange])

  const handleCancel = useCallback(() => {
    setFormData({})
    onOpenChange(false)
  }, [onOpenChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!hasError) handleSave()
      }
    },
    [hasError, handleSave]
  )

  const fieldCount = orderedIds.filter((id) => fieldMetadata[id]).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[540px] p-0 gap-0 overflow-hidden border-border/60 shadow-xl [--tw-shadow-color:rgba(0,0,0,0.12)] dark:[--tw-shadow-color:rgba(0,0,0,0.4)]"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
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
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form fields with staggered feel */}
        <div className="grid grid-cols-1 gap-4 px-6 py-5 max-h-[55vh] overflow-y-auto overscroll-contain">
          {orderedIds.map((columnId, index) => {
            const fieldInfo = fieldMetadata[columnId]
            if (!fieldInfo) return null

            const value = formData[columnId] ?? ''
            const error = getValidationError(
              formData[columnId],
              fieldInfo.type,
              fieldInfo.config
            )
            const showError = columnId in formData ? !!error : false
            const Icon = getFieldIcon(fieldInfo.type)

            return (
              <div
                key={columnId}
                className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
              >
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {Icon && (
                    <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                  )}
                  {fieldInfo.name}
                  {fieldInfo.config?.isRequired && (
                    <span className="text-destructive/80">*</span>
                  )}
                </label>
                <div
                  className={cn(
                    'rounded-lg border bg-muted/30 focus-within:bg-background focus-within:ring-2 focus-within:ring-offset-1 transition-all duration-200',
                    showError
                      ? 'border-destructive/60 focus-within:ring-destructive/25'
                      : 'border-border/50 focus-within:border-primary/30 focus-within:ring-primary/15'
                  )}
                  title={error ?? undefined}
                >
                  <DataTableInput
                    value={value}
                    onChange={(newValue) => {
                      const sanitized = sanitizeValue(
                        newValue,
                        fieldInfo.type,
                        fieldInfo.config
                      )
                      const bindingUpdates =
                        (fieldInfo.type === 'options' || fieldInfo.type === 'multiselect') &&
                          getBindingUpdates
                          ? getBindingUpdates(columnId, sanitized) ?? {}
                          : {}
                      setFormData((prev) => ({
                        ...prev,
                        [columnId]: sanitized,
                        ...bindingUpdates,
                      }))
                    }}
                    type={fieldInfo.type}
                    options={fieldInfo.options}
                    config={fieldInfo.config}
                    className="h-10 px-3 bg-transparent border-0 focus-visible:ring-0 rounded-lg"
                    autoFocus={index === 0}
                  />
                </div>
                {showError && error && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    {error}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <DialogFooter className="flex flex-row justify-end gap-2 px-6 py-4 border-t border-border/40 bg-muted/20">
          <Button variant="outline" size="sm" onClick={handleCancel} className="min-w-[80px]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={hasError}
            className={cn(
              'min-w-[100px] font-medium transition-all',
              mode === 'add' && 'shadow-sm'
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
