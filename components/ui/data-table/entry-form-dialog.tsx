'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getValidationError, sanitizeValue, type FieldMetadata } from './utils'
import { DataTableInput } from './data-table-input'
import { cn } from '@/lib/utils'
import { useMemo, useState, useEffect } from 'react'

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

  const handleSave = () => {
    onSave(formData)
    setFormData({})
    onOpenChange(false)
  }

  const handleCancel = () => {
    setFormData({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4 max-h-[60vh] overflow-y-auto">
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

            return (
              <div key={columnId} className="flex flex-col space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {fieldInfo.name}
                </span>
                <div
                  className={cn(
                    'rounded-md border bg-muted/5 focus-within:bg-background focus-within:ring-1 transition-all',
                    showError
                      ? 'border-destructive focus-within:ring-destructive/20'
                      : 'border-border/40 focus-within:ring-primary/20'
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
                      setFormData((prev) => ({
                        ...prev,
                        [columnId]: sanitized,
                      }))
                    }}
                    type={fieldInfo.type}
                    options={fieldInfo.options}
                    config={fieldInfo.config}
                    className="h-10 px-3 bg-transparent border-0 focus-visible:ring-0"
                    autoFocus={index === 0}
                  />
                </div>
                {showError && error && (
                  <p className="text-destructive text-xs">{error}</p>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={hasError}>
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
