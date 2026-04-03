'use client'

import { Button } from '@/components/ui/button'
import { Plus, Trash2, Wand2, X } from 'lucide-react'
import { FieldMappingsEditor } from '../../bindings/FieldMappingsEditor'
import { normalizeMappings, resolvePathLabel } from '../../bindings/bindings-utils'
import type { TrackerDisplayProps } from '../../types'
import type { BindingDraft } from '../../bindings/bindings-utils'
import { BindingSourceCascade } from './BindingSourceCascade'

export interface BindingsTabProps {
 gridId: string | null | undefined
 schema: TrackerDisplayProps | undefined
 bindingKey: string
 resolvePathLabelFn: (path: string) => string
 resolveBindingFromPathLabelFn: (path: string) => string
 bindingEnabled: boolean
 setBindingEnabled: (v: boolean) => void
 bindingDraft: BindingDraft | null
 setBindingDraftValue: (next: BindingDraft) => void
 defaultBindingDraft: () => BindingDraft
 bindingValidation: { isValid: boolean; errors: Record<string, string> }
 getGridFieldOptions: (gridIdValue?: string | null) => Array<{ value: string; label: string }>
 getBindingSourceGridFieldOptions: (gridIdValue?: string | null) => Array<{ value: string; label: string }>
 allFieldPathOptions: Array<{ value: string; label: string }>
 applyAutoMappings: () => void
 applyBindingSourcePick: (pick: {
 optionsSourceSchemaId?: string
 optionsGrid: string
 labelField: string
 }) => void
 projectIdForBindings: string | null | undefined
 currentTrackerSchemaId: string | null | undefined
 currentTrackerName: string | null | undefined
 siblingTrackers: Array<{ id: string; name: string | null }>
 siblingsLoading: boolean
 sourceSchema: TrackerDisplayProps | null
 sourceSchemaLoading: boolean
}

export function BindingsTab({
 gridId,
 schema,
 bindingKey,
 resolvePathLabelFn,
 resolveBindingFromPathLabelFn,
 bindingEnabled,
 setBindingEnabled,
 bindingDraft,
 setBindingDraftValue,
 defaultBindingDraft,
 bindingValidation,
 getGridFieldOptions,
 getBindingSourceGridFieldOptions,
 allFieldPathOptions,
 applyAutoMappings,
 applyBindingSourcePick,
 projectIdForBindings,
 currentTrackerSchemaId,
 currentTrackerName,
 siblingTrackers,
 siblingsLoading,
 sourceSchema,
 sourceSchemaLoading,
}: BindingsTabProps) {
 if (!gridId) {
 return (
 <div className="rounded-sm border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-3">
 <p className="text-sm text-muted-foreground">
 Bindings require this field to be placed in a grid.
 </p>
 </div>
 )
 }
 if (!bindingEnabled) {
 return (
 <div className="rounded-sm border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-4">
 <p className="text-sm text-muted-foreground">
 No binding yet. Bindings connect this select field to master data.
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
 if (!schema || !bindingDraft) return null

 return (
 <div className="space-y-5">
 <div className="rounded-sm border border-border/60 bg-muted/30 px-4 py-3">
 <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
 Select field
 </p>
 <div className="text-sm font-medium mt-1">
 {resolvePathLabelFn(bindingKey)}
 </div>
 <div className="text-xs text-muted-foreground">{bindingKey}</div>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase">
 Master data source
 </label>
 <p className="text-xs text-muted-foreground">
 Choose a tracker, then any grid, then the field that provides labels and stored values for master data.
 </p>
 <BindingSourceCascade
 localSchema={schema}
 currentTrackerSchemaId={currentTrackerSchemaId}
 currentTrackerName={currentTrackerName}
 projectId={projectIdForBindings}
 siblingTrackers={siblingTrackers}
 siblingsLoading={siblingsLoading}
 sourceSchema={sourceSchema}
 sourceSchemaLoading={sourceSchemaLoading}
 bindingDraft={bindingDraft}
 onPick={applyBindingSourcePick}
 />
 {(bindingValidation.errors.optionsGrid || bindingValidation.errors.labelField) && (
 <div className="text-xs text-destructive space-y-0.5">
 {bindingValidation.errors.optionsGrid && <div>{bindingValidation.errors.optionsGrid}</div>}
 {bindingValidation.errors.labelField && <div>{bindingValidation.errors.labelField}</div>}
 </div>
 )}
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
 master data fields (left) are copied into target fields on this grid (right).
 </p>
 <FieldMappingsEditor
 value={bindingDraft.fieldMappings}
 onChange={(next) =>
 setBindingDraftValue({ ...bindingDraft, fieldMappings: next })
 }
 fromOptions={
 bindingDraft.optionsGrid
 ? getBindingSourceGridFieldOptions(bindingDraft.optionsGrid)
 : allFieldPathOptions
 }
 toOptions={gridId ? getGridFieldOptions(gridId) : allFieldPathOptions}
 className="w-full"
 />
 {bindingValidation.errors.fieldMappings && (
 <div className="text-xs text-destructive">{bindingValidation.errors.fieldMappings}</div>
 )}
 <div className="rounded-sm border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
 <div className="font-medium text-foreground/80">Preview</div>
 {normalizeMappings(bindingDraft.fieldMappings).length === 0 ? (
 <div>No mappings yet. Auto-map or add rows.</div>
 ) : (
 normalizeMappings(bindingDraft.fieldMappings).map((m, idx) => (
 <div key={idx}>
 {resolveBindingFromPathLabelFn(m.from)} →{' '}
 {resolvePathLabel(m.to, schema?.grids ?? [], schema?.fields ?? [])}
 </div>
 ))
 )}
 </div>
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
