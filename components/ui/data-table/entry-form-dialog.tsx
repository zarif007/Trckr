'use client'

import { getValidationError, sanitizeValue, getFieldIcon, type FieldMetadata } from './utils'
import { DataTableInput } from './data-table-input'
import { FormDialog } from './form-dialog'
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { applyFieldOverrides } from '@/lib/depends-on'

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
  /** When using "save & add another" (Shift+Enter), called instead of onSave. */
  onSaveAnother?: (values: Record<string, unknown>) => void
  /** When a select/multiselect field changes, return extra field updates (e.g. from bindings) to merge into form. */
  getBindingUpdates?: (fieldId: string, value: unknown) => Record<string, unknown>
  /** Resolve field overrides (hidden/required/disabled) based on current form values. */
  getFieldOverrides?: (values: Record<string, unknown>, fieldId: string) => Record<string, unknown> | undefined
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
  onSaveAnother,
  getBindingUpdates,
  getFieldOverrides,
  mode = 'add',
}: EntryFormDialogProps) {
  const orderedIds = fieldOrder ?? Object.keys(fieldMetadata)
  const [formData, setFormData] = useState<Record<string, unknown>>(initialValues)

  // Only reset form when dialog opens; don't reset when parent re-renders (e.g. after "Add option")
  // so that the newly selected option is preserved in the form.
  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormData(initialValues ?? {})
    }
    prevOpenRef.current = open
  }, [open, initialValues])

  const hasError = useMemo(() => {
    return orderedIds.some((columnId) => {
      const fieldInfo = fieldMetadata[columnId]
      if (!fieldInfo) return false
      const overrides = getFieldOverrides?.(formData, columnId)
      const effectiveConfig = applyFieldOverrides(fieldInfo.config, overrides)
      if (effectiveConfig?.isHidden || effectiveConfig?.isDisabled) return false
      return !!getValidationError(
        formData[columnId],
        fieldInfo.type,
        effectiveConfig
      )
    })
  }, [formData, fieldMetadata, orderedIds, getFieldOverrides])

  const handleSave = useCallback(() => {
    onSave(formData)
    setFormData({})
    onOpenChange(false)
  }, [formData, onSave, onOpenChange])

  const handleSaveAndContinue = useCallback(() => {
    if (!onSaveAnother) return
    onSaveAnother(formData)
    // Reset form for the next entry but keep dialog open
    setFormData(initialValues ?? {})
  }, [formData, onSaveAnother, initialValues])

  const handleCancel = useCallback(() => {
    setFormData({})
    onOpenChange(false)
  }, [onOpenChange])

  const fieldCount = orderedIds.filter((id) => fieldMetadata[id]).length

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submitLabel={submitLabel}
      fieldCount={fieldCount}
      disableSubmit={hasError}
      mode={mode}
      onSubmit={handleSave}
      onSubmitAndContinue={onSaveAnother ? handleSaveAndContinue : undefined}
      onCancel={handleCancel}
    >
      <div className="grid grid-cols-1 gap-4">
        {orderedIds.map((columnId, index) => {
          const fieldInfo = fieldMetadata[columnId]
          if (!fieldInfo) return null
          const overrides = getFieldOverrides?.(formData, columnId)
          const effectiveConfig = applyFieldOverrides(fieldInfo.config, overrides)
          if (effectiveConfig?.isHidden) return null

          const value = formData[columnId] ?? ''
          const error = getValidationError(
            formData[columnId],
            fieldInfo.type,
            effectiveConfig
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
                {String(fieldInfo.name)}
                {effectiveConfig?.isRequired === true && (
                  <span className="text-destructive/80">*</span>
                )}
              </label>
              <div
                className={
                  'rounded-lg border bg-muted/30 focus-within:bg-background transition-[color,box-shadow] ' +
                  (showError
                    ? 'border-destructive/60'
                    : 'border-input hover:border-ring focus-within:border-ring')
                }
                title={error ?? undefined}
              >
                <DataTableInput
                  formField
                  value={value}
                  onChange={(newValue, options) => {
                    const sanitized = sanitizeValue(
                      newValue,
                      fieldInfo.type,
                      effectiveConfig
                    )
                    const bindingUpdates =
                      options?.bindingUpdates ??
                      ((fieldInfo.type === 'options' || fieldInfo.type === 'multiselect') &&
                        getBindingUpdates
                        ? getBindingUpdates(columnId, sanitized) ?? {}
                        : {})
                    setFormData((prev) => ({
                      ...prev,
                      [columnId]: sanitized,
                      ...bindingUpdates,
                    }))
                  }}
                  type={fieldInfo.type}
                  options={fieldInfo.options}
                  config={effectiveConfig}
                  disabled={!!effectiveConfig?.isDisabled}
                  onAddOption={fieldInfo.onAddOption}
                  optionsGridFields={fieldInfo.optionsGridFields}
                  getBindingUpdatesFromRow={fieldInfo.getBindingUpdatesFromRow}
                  className="h-10 px-3 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0 rounded-lg"
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
    </FormDialog>
  )
}
