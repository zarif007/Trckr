'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/select'
import { Plus, Trash2, Wand2, X } from 'lucide-react'
import { FieldMappingsEditor } from '../../bindings/FieldMappingsEditor'
import { normalizeMappings, resolvePathLabel } from '../../bindings/bindings-utils'
import type { TrackerDisplayProps } from '../../types'
import type { BindingDraft } from '../../bindings/bindings-utils'

function BindingSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
}) {
  if (options.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border-border/60 bg-background/90"
      />
    )
  }
  return (
    <SearchableSelect
      options={options}
      value={value || '__empty__'}
      onValueChange={(val) => onChange(val === '__empty__' ? '' : val)}
      placeholder={placeholder}
      searchPlaceholder={placeholder}
      className="w-full h-10"
    />
  )
}

export interface BindingsTabProps {
  gridId: string | null | undefined
  schema: TrackerDisplayProps | undefined
  bindingKey: string
  resolvePathLabelFn: (path: string) => string
  bindingEnabled: boolean
  setBindingEnabled: (v: boolean) => void
  bindingDraft: BindingDraft | null
  setBindingDraftValue: (next: BindingDraft) => void
  defaultBindingDraft: () => BindingDraft
  bindingValidation: { isValid: boolean; errors: Record<string, string> }
  getGridFieldOptions: (gridIdValue?: string | null) => Array<{ value: string; label: string }>
  allGridOptions: Array<{ value: string; label: string }>
  optionsGridOptions: Array<{ value: string; label: string }>
  allFieldPathOptions: Array<{ value: string; label: string }>
  applyAutoMappings: () => void
}

export function BindingsTab({
  gridId,
  schema,
  bindingKey,
  resolvePathLabelFn,
  bindingEnabled,
  setBindingEnabled,
  bindingDraft,
  setBindingDraftValue,
  defaultBindingDraft,
  bindingValidation,
  getGridFieldOptions,
  allGridOptions,
  optionsGridOptions,
  allFieldPathOptions,
  applyAutoMappings,
}: BindingsTabProps) {
  if (!gridId) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Bindings require this field to be placed in a grid.
        </p>
      </div>
    )
  }
  if (!bindingEnabled) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          No binding yet. Bindings connect this select field to an options grid.
        </p>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setBindingEnabled(true)
            setBindingDraftValue(defaultBindingDraft())
          }}
        >
          <Plus className="h-4 w-4" />
          Create binding
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Select field
        </p>
        <div className="text-sm font-medium mt-1">
          {resolvePathLabelFn(bindingKey)}
        </div>
        <div className="text-xs text-muted-foreground">{bindingKey}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase">
            Options grid
          </label>
          {bindingDraft && (
            <BindingSelect
              value={bindingDraft.optionsGrid}
              onChange={(val) =>
                setBindingDraftValue({
                  ...bindingDraft,
                  optionsGrid: val,
                })
              }
              options={allGridOptions.length > 0 ? allGridOptions : optionsGridOptions}
              placeholder="Options grid"
            />
          )}
          {bindingValidation.errors.optionsGrid && (
            <div className="text-xs text-destructive">{bindingValidation.errors.optionsGrid}</div>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase">
            Label field
          </label>
          {bindingDraft && (
            <BindingSelect
              value={bindingDraft.labelField}
              onChange={(val) => setBindingDraftValue({ ...bindingDraft, labelField: val })}
              options={
                bindingDraft.optionsGrid
                  ? getGridFieldOptions(bindingDraft.optionsGrid)
                  : allFieldPathOptions
              }
              placeholder="Label field"
            />
          )}
          {bindingValidation.errors.labelField && (
            <div className="text-xs text-destructive">{bindingValidation.errors.labelField}</div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase">
            Field mappings
          </label>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={applyAutoMappings}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Auto-map
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Mappings control auto‑population. When a user selects an option, values from the
          options grid fields (left) are copied into target fields on this grid (right).
        </p>
        {bindingDraft && (
          <FieldMappingsEditor
            value={bindingDraft.fieldMappings}
            onChange={(next) =>
              setBindingDraftValue({ ...bindingDraft, fieldMappings: next })
            }
            fromOptions={
              bindingDraft.optionsGrid
                ? getGridFieldOptions(bindingDraft.optionsGrid)
                : allFieldPathOptions
            }
            toOptions={gridId ? getGridFieldOptions(gridId) : allFieldPathOptions}
            className="w-full"
          />
        )}
        {bindingValidation.errors.fieldMappings && (
          <div className="text-xs text-destructive">{bindingValidation.errors.fieldMappings}</div>
        )}
        {bindingDraft && (
          <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground/80">Preview</div>
            {normalizeMappings(bindingDraft.fieldMappings).length === 0 ? (
              <div>No mappings yet. Auto-map or add rows.</div>
            ) : (
              normalizeMappings(bindingDraft.fieldMappings).map((m, idx) => (
                <div key={idx}>
                  {resolvePathLabel(m.from, schema?.grids ?? [], schema?.fields ?? [])} →{' '}
                  {resolvePathLabel(m.to, schema?.grids ?? [], schema?.fields ?? [])}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {!bindingValidation.isValid && (
          <div className="text-xs text-destructive flex items-center gap-1">
            <X className="h-3.5 w-3.5" />
            Fix binding errors before saving.
          </div>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            setBindingEnabled(false)
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove binding
        </Button>
      </div>
    </div>
  )
}
