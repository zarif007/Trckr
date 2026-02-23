'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { parsePath } from '@/lib/resolve-bindings'
import type { TrackerBindings, TrackerBindingEntry } from '@/lib/types/tracker-bindings'
import type { TrackerGrid, TrackerField, TrackerLayoutNode } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/select'
import { resolveTableStyles } from '@/lib/style-utils'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Check, X, Wand2 } from 'lucide-react'
import type { TrackerDisplayProps } from './types'
import { FieldMappingsEditor } from './bindings/FieldMappingsEditor'
import {
  buildFieldPathOptions,
  buildGridFieldMap,
  buildOptionsGridOptions,
  buildPathLabelMap,
  ensureValueMapping,
  normalizeMappings,
  resolvePathLabel,
  suggestFieldMappings,
  validateBindingDraft,
  type BindingDraft,
} from './bindings/bindings-utils'

const NEW_ROW_KEY = '__new_binding__'

export interface BindingsTableProps {
  bindings: TrackerBindings
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes?: TrackerLayoutNode[]
  styleOverrides?: import('./types').StyleOverrides
  /** When set with onSchemaChange, table is editable (add/edit/delete bindings). */
  schema?: TrackerDisplayProps
  onSchemaChange?: (schema: TrackerDisplayProps) => void
  /** Optional: update bindings directly without providing full schema. */
  onBindingsChange?: (bindings: TrackerBindings) => void
}

export function BindingsTable({
  bindings,
  grids,
  fields,
  layoutNodes,
  styleOverrides,
  schema,
  onSchemaChange,
  onBindingsChange,
}: BindingsTableProps) {
  const ts = useMemo(() => resolveTableStyles(styleOverrides), [styleOverrides])
  const canEdit = Boolean((schema && onSchemaChange) || onBindingsChange)

  const contextGrids = schema?.grids ?? grids
  const contextFields = schema?.fields ?? fields
  const contextLayoutNodes = schema?.layoutNodes ?? layoutNodes ?? []

  const entries = useMemo(
    () => Object.entries(bindings ?? {}).filter(([, entry]) => entry && typeof entry === 'object'),
    [bindings]
  )

  const gridNameMap = useMemo(
    () => new Map(contextGrids.map((g) => [g.id, g.name ?? g.id])),
    [contextGrids]
  )

  const pathLabelMap = useMemo(
    () => buildPathLabelMap(contextLayoutNodes, contextGrids, contextFields),
    [contextLayoutNodes, contextGrids, contextFields]
  )

  const selectFieldOptions = useMemo(
    () =>
      buildFieldPathOptions(contextLayoutNodes, contextGrids, contextFields, ({ field }) =>
        field.dataType === 'options' || field.dataType === 'multiselect'
      ),
    [contextLayoutNodes, contextGrids, contextFields]
  )

  const allFieldPathOptions = useMemo(
    () => buildFieldPathOptions(contextLayoutNodes, contextGrids, contextFields),
    [contextLayoutNodes, contextGrids, contextFields]
  )

  const optionsGridOptions = useMemo(
    () => buildOptionsGridOptions(contextGrids),
    [contextGrids]
  )

  const gridFieldMap = useMemo(
    () => buildGridFieldMap(contextLayoutNodes),
    [contextLayoutNodes]
  )

  const existingKeys = useMemo(() => new Set(Object.keys(bindings ?? {})), [bindings])

  const candidateKeysForAdd = useMemo(() => {
    const inBindings = existingKeys
    return selectFieldOptions.map((opt) => opt.value).filter((path) => !inBindings.has(path))
  }, [selectFieldOptions, existingKeys])

  const getPathLabel = useCallback(
    (path: string) => pathLabelMap.get(path) ?? resolvePathLabel(path, contextGrids, contextFields),
    [pathLabelMap, contextGrids, contextFields]
  )

  const getGridFieldOptions = useCallback(
    (gridId?: string | null) => {
      if (!gridId) return []
      const fieldIds = gridFieldMap.get(gridId)
      if (!fieldIds || fieldIds.size === 0) return []
      const options = Array.from(fieldIds).map((fieldId) => {
        const path = `${gridId}.${fieldId}`
        return {
          value: path,
          label: pathLabelMap.get(path) ?? resolvePathLabel(path, contextGrids, contextFields),
        }
      })
      return options.sort((a, b) => a.label.localeCompare(b.label))
    },
    [gridFieldMap, pathLabelMap, contextGrids, contextFields]
  )

  const buildDraftForKey = useCallback(
    (key: string): BindingDraft => {
      const trimmed = key.trim()
      if (!trimmed) return { key: '', optionsGrid: '', labelField: '', fieldMappings: [] }
      const { fieldId } = parsePath(trimmed)
      const inferredOptionsGrid = fieldId ? `${fieldId}_options_grid` : ''
      const optionsGrid =
        contextGrids.find((g) => g.id === inferredOptionsGrid)?.id ?? inferredOptionsGrid
      const labelField = fieldId && optionsGrid ? `${optionsGrid}.${fieldId}` : ''
      const fieldMappings = labelField ? [{ from: labelField, to: trimmed }] : []
      return {
        key: trimmed,
        optionsGrid,
        labelField,
        fieldMappings,
      }
    },
    [contextGrids]
  )

  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(entries[0]?.[0] ?? null)
  const [draft, setDraft] = useState<BindingDraft | null>(null)
  const [originalKey, setOriginalKey] = useState<string | null>(null)
  const [isNewDraft, setIsNewDraft] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (selectedKey === NEW_ROW_KEY) return
    if (selectedKey && !bindings[selectedKey]) {
      const next = entries[0]?.[0] ?? null
      setSelectedKey(next)
      return
    }
    if (!selectedKey && entries.length > 0) {
      setSelectedKey(entries[0][0])
    }
  }, [bindings, entries, selectedKey])

  useEffect(() => {
    if (!selectedKey || dirty || isNewDraft) return
    const entry = bindings?.[selectedKey] as TrackerBindingEntry | undefined
    if (!entry) return
    setDraft({
      key: selectedKey,
      optionsGrid: entry.optionsGrid ?? '',
      labelField: entry.labelField ?? '',
      fieldMappings: Array.isArray(entry.fieldMappings) ? [...entry.fieldMappings] : [],
    })
    setOriginalKey(selectedKey)
  }, [selectedKey, bindings, dirty, isNewDraft])

  const emitBindings = useCallback(
    (nextBindings: TrackerBindings) => {
      if (onBindingsChange) {
        onBindingsChange(nextBindings)
        return
      }
      if (schema && onSchemaChange) {
        onSchemaChange({ ...schema, bindings: nextBindings })
      }
    },
    [onBindingsChange, schema, onSchemaChange]
  )

  const draftValidation = useMemo(() => {
    if (!draft) return { isValid: false, errors: {} }
    return validateBindingDraft(draft, {
      existingKeys,
      originalKey: isNewDraft ? null : originalKey,
      gridFieldMap,
    })
  }, [draft, existingKeys, isNewDraft, originalKey, gridFieldMap])

  const setDraftValue = useCallback((next: BindingDraft) => {
    setDraft(next)
    setDirty(true)
  }, [])

  const handleSelectBinding = useCallback(
    (key: string) => {
      if (key === selectedKey) return
      if (dirty) {
        const ok = window.confirm('You have unsaved changes. Discard them?')
        if (!ok) return
      }
      setSelectedKey(key)
      setDirty(false)
      setIsNewDraft(false)
    },
    [dirty, selectedKey]
  )

  const openAdd = useCallback(() => {
    if (!canEdit) return
    if (dirty) {
      const ok = window.confirm('You have unsaved changes. Discard them?')
      if (!ok) return
    }
    const first = candidateKeysForAdd[0] ?? ''
    const nextDraft = buildDraftForKey(first)
    setDraft(nextDraft)
    setOriginalKey(null)
    setSelectedKey(NEW_ROW_KEY)
    setIsNewDraft(true)
    setDirty(true)
  }, [canEdit, dirty, candidateKeysForAdd, buildDraftForKey])

  const discardChanges = useCallback(() => {
    if (isNewDraft) {
      setDraft(null)
      setSelectedKey(entries[0]?.[0] ?? null)
      setIsNewDraft(false)
      setDirty(false)
      return
    }
    if (originalKey) {
      const entry = bindings?.[originalKey] as TrackerBindingEntry | undefined
      if (entry) {
        setDraft({
          key: originalKey,
          optionsGrid: entry.optionsGrid ?? '',
          labelField: entry.labelField ?? '',
          fieldMappings: Array.isArray(entry.fieldMappings) ? [...entry.fieldMappings] : [],
        })
      }
    }
    setDirty(false)
  }, [isNewDraft, entries, originalKey, bindings])

  const saveDraft = useCallback(() => {
    if (!draft || !draftValidation.isValid) return
    const trimmed: BindingDraft = {
      key: draft.key.trim(),
      optionsGrid: draft.optionsGrid.trim(),
      labelField: draft.labelField.trim(),
      fieldMappings: draft.fieldMappings ?? [],
    }
    let fieldMappings = normalizeMappings(trimmed.fieldMappings)
    fieldMappings = ensureValueMapping(fieldMappings, trimmed.labelField, trimmed.key)

    const nextBindings = { ...(bindings ?? {}) }
    if (!isNewDraft && originalKey && originalKey !== trimmed.key) {
      delete nextBindings[originalKey]
    }
    if (trimmed.key) {
      nextBindings[trimmed.key] = {
        optionsGrid: trimmed.optionsGrid,
        labelField: trimmed.labelField,
        fieldMappings,
      }
    }
    emitBindings(nextBindings)
    setSelectedKey(trimmed.key)
    setOriginalKey(trimmed.key)
    setIsNewDraft(false)
    setDirty(false)
  }, [draft, draftValidation.isValid, bindings, originalKey, isNewDraft, emitBindings])

  const removeBinding = useCallback(() => {
    if (!canEdit || !selectedKey || selectedKey === NEW_ROW_KEY) return
    const ok = window.confirm('Delete this binding?')
    if (!ok) return
    const nextBindings = { ...(bindings ?? {}) }
    delete nextBindings[selectedKey]
    emitBindings(nextBindings)
    setSelectedKey(entries[0]?.[0] ?? null)
    setDraft(null)
    setDirty(false)
    setIsNewDraft(false)
  }, [canEdit, selectedKey, bindings, emitBindings, entries])

  const applyAutoMappings = useCallback(() => {
    if (!draft) return
    const existing = normalizeMappings(draft.fieldMappings)
    const suggestions = suggestFieldMappings({
      selectFieldPath: draft.key,
      optionsGrid: draft.optionsGrid,
      labelField: draft.labelField,
      existingMappings: existing,
      gridFieldMap,
    })
    if (suggestions.length === 0) return
    setDraftValue({ ...draft, fieldMappings: [...existing, ...suggestions] })
  }, [draft, gridFieldMap, setDraftValue])

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return entries
    return entries.filter(([key, entry]) => {
      const optionsGridName = gridNameMap.get(entry.optionsGrid) ?? entry.optionsGrid
      const mappingLabel = (entry.fieldMappings ?? [])
        .map((m) => `${getPathLabel(m.from)} → ${getPathLabel(m.to)}`)
        .join('; ')
      const haystack = [
        key,
        getPathLabel(key),
        entry.optionsGrid ?? '',
        optionsGridName ?? '',
        entry.labelField ?? '',
        getPathLabel(entry.labelField ?? ''),
        mappingLabel,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [entries, search, gridNameMap, getPathLabel])

  const mappingPreview = useMemo(() => {
    if (!draft) return []
    const normalized = normalizeMappings(draft.fieldMappings)
    return normalized.map((m) => `${getPathLabel(m.from)} → ${getPathLabel(m.to)}`)
  }, [draft, getPathLabel])

  const renderSelectInput = (
    value: string,
    onChange: (next: string) => void,
    options: Array<{ value: string; label: string }>,
    placeholder: string
  ) => {
    if (options.length === 0) {
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
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
        className="w-full"
      />
    )
  }

  const emptyMessage = search.trim()
    ? 'No bindings match your search.'
    : canEdit
      ? 'No bindings yet. Click "Add binding" to add one.'
      : 'No bindings.'

  return (
    <div
      className={cn(
        'rounded-md overflow-hidden',
        ts.borderStyle,
        ts.accentBorder,
        ts.tableBg || 'bg-card/50',
        ts.fontSize,
        ts.fontWeight,
        ts.textColor
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border/50">
        <div>
          <div className="text-sm font-medium">Bindings</div>
          <div className="text-xs text-muted-foreground">
            {entries.length} binding{entries.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bindings..."
            className="h-8 w-56"
          />
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAdd}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add binding
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <div className="border-r border-border/40 bg-muted/20">
          {filteredEntries.length === 0 && !isNewDraft ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              {emptyMessage}
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {isNewDraft && draft && (
                <li key={NEW_ROW_KEY}>
                  <div className="w-full px-4 py-3 text-left bg-background">
                    <div className="text-sm font-medium truncate">
                      {draft.key ? getPathLabel(draft.key) : 'New binding'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Draft · Not saved
                    </div>
                  </div>
                </li>
              )}
              {filteredEntries.map(([key, entry]) => {
                const isActive = selectedKey === key
                const optionsGridName = gridNameMap.get(entry.optionsGrid) ?? entry.optionsGrid
                const mappingCount = (entry.fieldMappings ?? []).length
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors',
                        isActive ? 'bg-background' : 'hover:bg-muted/60'
                      )}
                      onClick={() => handleSelectBinding(key)}
                    >
                      <div className="text-sm font-medium truncate">{getPathLabel(key)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {optionsGridName} · {mappingCount} mapping{mappingCount === 1 ? '' : 's'}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="p-4 space-y-4">
          {!draft ? (
            <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              {entries.length === 0 ? emptyMessage : 'Select a binding to view details.'}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Binding details</div>
                  <div className="text-xs text-muted-foreground">
                    {isNewDraft ? 'Create a new binding.' : 'Edit the selected binding.'}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={discardChanges}
                      disabled={!dirty}
                    >
                      Discard
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveDraft}
                      disabled={!dirty || !draftValidation.isValid}
                      className="gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
                    {!isNewDraft && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeBinding}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Select field</label>
                  <div className="mt-1">
                    {renderSelectInput(
                      draft.key,
                      (val) => setDraftValue(buildDraftForKey(val)),
                      selectFieldOptions,
                      'Select field'
                    )}
                  </div>
                  {draftValidation.errors.key && (
                    <div className="text-xs text-destructive mt-1">{draftValidation.errors.key}</div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Options grid</label>
                    <div className="mt-1">
                      {renderSelectInput(
                        draft.optionsGrid,
                        (val) => {
                          const labelField = draft.labelField
                          const labelFieldId = labelField ? parsePath(labelField).fieldId : null
                          const options = getGridFieldOptions(val)
                          const nextLabelField =
                            labelFieldId && options.some((opt) => opt.value.endsWith(`.${labelFieldId}`))
                              ? `${val}.${labelFieldId}`
                              : options[0]?.value ?? ''
                          setDraftValue({
                            ...draft,
                            optionsGrid: val,
                            labelField: nextLabelField,
                          })
                        },
                        optionsGridOptions,
                        'Options grid'
                      )}
                    </div>
                    {draftValidation.errors.optionsGrid && (
                      <div className="text-xs text-destructive mt-1">{draftValidation.errors.optionsGrid}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Label field</label>
                    <div className="mt-1">
                      {renderSelectInput(
                        draft.labelField,
                        (val) => setDraftValue({ ...draft, labelField: val }),
                        draft.optionsGrid ? getGridFieldOptions(draft.optionsGrid) : allFieldPathOptions,
                        'Label field'
                      )}
                    </div>
                    {draftValidation.errors.labelField && (
                      <div className="text-xs text-destructive mt-1">{draftValidation.errors.labelField}</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Field mappings</label>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyAutoMappings}
                        className="gap-1.5"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        Auto-map
                      </Button>
                    )}
                  </div>
                  <div className="mt-2">
                    <FieldMappingsEditor
                      value={draft.fieldMappings}
                      onChange={(next) => setDraftValue({ ...draft, fieldMappings: next })}
                      fromOptions={draft.optionsGrid ? getGridFieldOptions(draft.optionsGrid) : allFieldPathOptions}
                      toOptions={(() => {
                        const gridId = draft.key ? parsePath(draft.key).gridId : null
                        return gridId ? getGridFieldOptions(gridId) : allFieldPathOptions
                      })()}
                      className="w-full"
                    />
                  </div>
                  {draftValidation.errors.fieldMappings && (
                    <div className="text-xs text-destructive mt-1">{draftValidation.errors.fieldMappings}</div>
                  )}
                  <div className="mt-3 rounded-md border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                    <div className="font-medium text-foreground/80">Preview</div>
                    {mappingPreview.length === 0 ? (
                      <div>No mappings yet. Auto-map or add rows.</div>
                    ) : (
                      mappingPreview.map((line, idx) => <div key={idx}>{line}</div>)
                    )}
                  </div>
                </div>

                {!draftValidation.isValid && dirty && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <X className="h-3.5 w-3.5" />
                    Fix validation errors before saving.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
