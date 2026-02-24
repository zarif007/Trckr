'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SearchableSelect,
} from '@/components/ui/select'
import { Plus, Trash2, Settings2, ShieldCheck, Sigma, Copy, ChevronDown, ChevronRight, ArrowRight, Wand2, X } from 'lucide-react'
import type { TrackerDisplayProps, TrackerFieldConfig } from '../types'
import type { FieldCalculationRule, FieldValidationRule, ExprNode } from '@/lib/functions/types'
import type { TrackerBindingEntry } from '@/lib/types/tracker-bindings'
import { FIELD_TYPE_LABELS, getCreatableFieldTypesWithLabels } from './utils'
import type { TrackerFieldType } from '../types'
import { ExprRuleEditor } from './ExprRuleEditor'
import { FieldMappingsEditor } from '../bindings/FieldMappingsEditor'
import {
  buildGridFieldMap,
  buildOptionsGridOptions,
  buildFieldPathOptions,
  buildPathLabelMap,
  ensureValueMapping,
  normalizeMappings,
  resolvePathLabel,
  suggestFieldMappings,
  validateBindingDraft,
  type BindingDraft,
} from '../bindings/bindings-utils'
import { parsePath } from '@/lib/resolve-bindings'

const RULE_TYPES: Array<FieldValidationRule['type']> = [
  'required',
  'min',
  'max',
  'minLength',
  'maxLength',
  'expr',
]

const RULE_TYPE_LABELS: Record<FieldValidationRule['type'], string> = {
  required: 'Required',
  min: 'Minimum value',
  max: 'Maximum value',
  minLength: 'Minimum length',
  maxLength: 'Maximum length',
  expr: 'Custom expression',
}

const NUMERIC_TYPES: TrackerFieldType[] = ['number', 'currency', 'percentage']
const TEXT_TYPES: TrackerFieldType[] = ['string', 'text', 'link']

const defaultExpr: ExprNode = { op: 'const', value: true }
const defaultCalculationExpr: ExprNode = { op: 'const', value: 0 }

const toNumberOrUndefined = (value: string): number | undefined => {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const ensureRuleDefaults = (rule: FieldValidationRule): FieldValidationRule => {
  if (rule.type === 'expr') return rule.expr ? rule : { ...rule, expr: defaultExpr }
  if (rule.type === 'min' || rule.type === 'max' || rule.type === 'minLength' || rule.type === 'maxLength') {
    return typeof rule.value === 'number' ? rule : { ...rule, value: 0 }
  }
  return rule
}

interface FieldSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fieldId: string | null
  /** When set, validations/calculations are keyed by gridId.fieldId (like bindings). */
  gridId?: string | null
  schema: TrackerDisplayProps | undefined
  onSchemaChange: ((schema: TrackerDisplayProps) => void) | undefined
}

export function FieldSettingsDialog({
  open,
  onOpenChange,
  fieldId,
  gridId,
  schema,
  onSchemaChange,
}: FieldSettingsDialogProps) {
  const field = useMemo(() => {
    if (!schema || !fieldId) return null
    return schema.fields.find((f) => f.id === fieldId) ?? null
  }, [schema, fieldId])

  const [label, setLabel] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [dataType, setDataType] = useState<TrackerFieldType>('string')
  const [isRequired, setIsRequired] = useState(false)
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [minLength, setMinLength] = useState('')
  const [maxLength, setMaxLength] = useState('')
  const [rules, setRules] = useState<FieldValidationRule[]>([])
  const [calculationRule, setCalculationRule] = useState<FieldCalculationRule | null>(null)
  const [structureOpen, setStructureOpen] = useState(false)
  const [showJsonInStructure, setShowJsonInStructure] = useState(false)
  const [exprDrafts, setExprDrafts] = useState<Record<number, string>>({})
  const [bindingEnabled, setBindingEnabled] = useState(false)
  const [bindingDraft, setBindingDraft] = useState<BindingDraft | null>(null)
  const [bindingDirty, setBindingDirty] = useState(false)

  const availableFields = useMemo(() => {
    if (!gridId || !schema) return []
    const fieldsById = new Map(schema.fields.map((f) => [f.id, f]))
    const nodes = (schema.layoutNodes ?? [])
      .filter((n) => n.gridId === gridId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const seen = new Set<string>()
    const out = []
    for (const node of nodes) {
      if (!node.fieldId || seen.has(node.fieldId)) continue
      seen.add(node.fieldId)
      const fieldRef = fieldsById.get(node.fieldId)
      out.push({
        fieldId: `${gridId}.${node.fieldId}`,
        label: fieldRef?.ui?.label ?? node.fieldId,
        dataType: fieldRef?.dataType,
      })
    }
    return out
  }, [gridId, schema?.fields, schema?.layoutNodes])

  const bindingKey = useMemo(() => {
    if (!gridId || !field) return ''
    return `${gridId}.${field.id}`
  }, [gridId, field])

  const isBindable = dataType === 'options' || dataType === 'multiselect'

  const gridFieldMap = useMemo(
    () => buildGridFieldMap(schema?.layoutNodes ?? []),
    [schema?.layoutNodes]
  )

  const pathLabelMap = useMemo(
    () => buildPathLabelMap(schema?.layoutNodes ?? [], schema?.grids ?? [], schema?.fields ?? []),
    [schema?.layoutNodes, schema?.grids, schema?.fields]
  )

  const optionsGridOptions = useMemo(
    () => buildOptionsGridOptions(schema?.grids ?? []),
    [schema?.grids]
  )

  const allGridOptions = useMemo(
    () =>
      (schema?.grids ?? [])
        .map((g) => ({ value: g.id, label: g.name ?? g.id }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [schema?.grids]
  )

  const allFieldPathOptions = useMemo(
    () => buildFieldPathOptions(schema?.layoutNodes ?? [], schema?.grids ?? [], schema?.fields ?? []),
    [schema?.layoutNodes, schema?.grids, schema?.fields]
  )

  const getGridFieldOptions = useCallback(
    (gridIdValue?: string | null) => {
      if (!gridIdValue) return []
      const fieldIds = gridFieldMap.get(gridIdValue)
      if (!fieldIds || fieldIds.size === 0) return []
      const options = Array.from(fieldIds).map((fieldIdValue) => {
        const path = `${gridIdValue}.${fieldIdValue}`
        return {
          value: path,
          label:
            pathLabelMap.get(path) ??
            resolvePathLabel(path, schema?.grids ?? [], schema?.fields ?? []),
        }
      })
      return options.sort((a, b) => a.label.localeCompare(b.label))
    },
    [gridFieldMap, pathLabelMap, schema?.grids, schema?.fields]
  )

  const defaultBindingDraft = useCallback((): BindingDraft => {
    return {
      key: bindingKey,
      optionsGrid: '',
      labelField: '',
      fieldMappings: [],
    }
  }, [bindingKey])

  useEffect(() => {
    if (isBindable) return
    setBindingEnabled(false)
    setBindingDraft(null)
    setBindingDirty(false)
  }, [isBindable])

  useEffect(() => {
    if (!open || !field) return
    setLabel(field.ui.label ?? '')
    setPlaceholder(field.ui.placeholder ?? '')
    setDataType(field.dataType)
    setIsRequired(Boolean(field.config?.isRequired))
    setMin(field.config?.min != null ? String(field.config.min) : '')
    setMax(field.config?.max != null ? String(field.config.max) : '')
    setMinLength(field.config?.minLength != null ? String(field.config.minLength) : '')
    setMaxLength(field.config?.maxLength != null ? String(field.config.maxLength) : '')

    const validationKey = gridId ? `${gridId}.${field.id}` : ''
    const nextRules = (schema?.validations?.[validationKey] ?? []).map(ensureRuleDefaults)
    setRules(nextRules)
    const nextCalculation = validationKey ? (schema?.calculations?.[validationKey] ?? null) : null
    setCalculationRule(nextCalculation && nextCalculation.expr ? nextCalculation : null)
    setStructureOpen(false)
    setShowJsonInStructure(false)
    const isBindableField = field.dataType === 'options' || field.dataType === 'multiselect'
    if (isBindableField && bindingKey) {
      const existingBinding = schema?.bindings?.[bindingKey] as TrackerBindingEntry | undefined
      if (existingBinding) {
        setBindingEnabled(true)
        setBindingDraft({
          key: bindingKey,
          optionsGrid: existingBinding.optionsGrid ?? '',
          labelField: existingBinding.labelField ?? '',
          fieldMappings: Array.isArray(existingBinding.fieldMappings)
            ? [...existingBinding.fieldMappings]
            : [],
        })
      } else {
        setBindingEnabled(false)
        setBindingDraft(defaultBindingDraft())
      }
      setBindingDirty(false)
    } else {
      setBindingEnabled(false)
      setBindingDraft(null)
      setBindingDirty(false)
    }
  }, [open, field, schema, gridId, bindingKey, defaultBindingDraft])

  const bindingValidation = useMemo(() => {
    if (!bindingEnabled || !bindingDraft) return { isValid: true, errors: {} as Record<string, string> }
    return validateBindingDraft(
      { ...bindingDraft, key: bindingKey },
      {
        existingKeys: new Set(Object.keys(schema?.bindings ?? {})),
        originalKey: bindingKey,
        gridFieldMap,
      }
    )
  }, [bindingEnabled, bindingDraft, bindingKey, schema?.bindings, gridFieldMap])

  const autoPopulateSources = useMemo(() => {
    if (!gridId || !field?.id) return []
    const targetPath = `${gridId}.${field.id}`
    const sources = new Set<string>()
    for (const entry of Object.values(schema?.bindings ?? {})) {
      if (!entry || typeof entry !== 'object') continue
      const mappings = (entry as TrackerBindingEntry).fieldMappings ?? []
      for (const mapping of mappings) {
        if (!mapping || typeof mapping !== 'object') continue
        if (mapping.to === targetPath && typeof mapping.from === 'string') {
          sources.add(mapping.from)
        }
      }
    }
    return Array.from(sources)
  }, [schema?.bindings, gridId, field?.id])

  const typeOptions = useMemo(() => {
    const options = getCreatableFieldTypesWithLabels()
    if (field && !options.some((o) => o.value === field.dataType)) {
      return [
        { value: field.dataType, label: FIELD_TYPE_LABELS[field.dataType] ?? field.dataType, group: 'Other' as const },
        ...options,
      ]
    }
    return options
  }, [field])

  const groupedTypes = useMemo(
    () =>
      typeOptions.reduce<Record<string, typeof typeOptions>>((acc, opt) => {
        const g = opt.group ?? 'Other'
        if (!acc[g]) acc[g] = []
        acc[g].push(opt)
        return acc
      }, {}),
    [typeOptions]
  )

  if (!open || !field || !schema || !onSchemaChange) return null

  const updateRule = (index: number, nextRule: FieldValidationRule) => {
    setRules((prev) => prev.map((r, i) => (i === index ? ensureRuleDefaults(nextRule) : r)))
  }

  const setBindingDraftValue = (next: BindingDraft) => {
    setBindingDraft(next)
    setBindingDirty(true)
  }

  const applyAutoMappings = () => {
    if (!bindingDraft) return
    const existing = normalizeMappings(bindingDraft.fieldMappings)
    const suggestions = suggestFieldMappings({
      selectFieldPath: bindingKey,
      optionsGrid: bindingDraft.optionsGrid,
      labelField: bindingDraft.labelField,
      existingMappings: existing,
      gridFieldMap,
    })
    if (suggestions.length === 0) return
    setBindingDraftValue({ ...bindingDraft, fieldMappings: [...existing, ...suggestions] })
  }

  const renderBindingSelect = (
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

  const handleRuleTypeChange = (index: number, nextType: FieldValidationRule['type']) => {
    let nextExprDraft: string | null = null
    setRules((prev) => {
      const next = [...prev]
      const current = prev[index]
      const message = current?.message
      if (nextType === 'expr') {
        next[index] = { type: 'expr', expr: defaultExpr, message }
        nextExprDraft = JSON.stringify(defaultExpr, null, 2)
      } else if (nextType === 'required') {
        next[index] = { type: 'required', message }
      } else {
        next[index] = { type: nextType, value: 0, message }
      }
      return next.map(ensureRuleDefaults)
    })
    setExprDrafts((prev) => {
      const next = { ...prev }
      if (nextType === 'expr' && nextExprDraft != null) {
        next[index] = nextExprDraft
      } else {
        delete next[index]
      }
      return next
    })
  }

  const handleSave = () => {
    const nextConfig: TrackerFieldConfig = {
      ...(field.config ?? {}),
      isRequired,
      min: toNumberOrUndefined(min),
      max: toNumberOrUndefined(max),
      minLength: toNumberOrUndefined(minLength),
      maxLength: toNumberOrUndefined(maxLength),
    }

    Object.keys(nextConfig).forEach((key) => {
      if (nextConfig[key as keyof TrackerFieldConfig] === undefined) {
        delete nextConfig[key as keyof TrackerFieldConfig]
      }
    })

    const nextFields = schema.fields.map((f) =>
      f.id === field.id
        ? {
          ...f,
          dataType,
          ui: { ...f.ui, label: label.trim() || f.ui.label, placeholder: placeholder || undefined },
          config: nextConfig,
        }
        : f
    )

    const validationKey = gridId ? `${gridId}.${field.id}` : ''
    const nextValidations = { ...(schema.validations ?? {}) }
    if (validationKey) {
      if (rules.length > 0) {
        nextValidations[validationKey] = rules
      } else {
        delete nextValidations[validationKey]
      }
    }
    const nextCalculations = { ...(schema.calculations ?? {}) }
    if (validationKey) {
      if (calculationRule?.expr) {
        nextCalculations[validationKey] = calculationRule
      } else {
        delete nextCalculations[validationKey]
      }
    }

    const nextBindings = { ...(schema.bindings ?? {}) }
    if (bindingKey) {
      if (!isBindable) {
        delete nextBindings[bindingKey]
      } else if (!bindingEnabled) {
        delete nextBindings[bindingKey]
      } else if (bindingDraft) {
        let fieldMappings = normalizeMappings(bindingDraft.fieldMappings)
        fieldMappings = ensureValueMapping(fieldMappings, bindingDraft.labelField, bindingKey)
        nextBindings[bindingKey] = {
          optionsGrid: bindingDraft.optionsGrid.trim(),
          labelField: bindingDraft.labelField.trim(),
          fieldMappings,
        }
      }
    }

    onSchemaChange({
      ...schema,
      fields: nextFields,
      validations: Object.keys(nextValidations).length > 0 ? nextValidations : undefined,
      calculations: Object.keys(nextCalculations).length > 0 ? nextCalculations : undefined,
      bindings: nextBindings,
    })

    onOpenChange(false)
  }

  const isNumeric = NUMERIC_TYPES.includes(dataType)
  const isText = TEXT_TYPES.includes(dataType)
  const disableSave = isBindable && bindingEnabled && bindingDraft && !bindingValidation.isValid
  const groupOrder = ['Text', 'Numbers', 'Date & time', 'Choice', 'Other']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col sm:max-w-[720px] p-0 gap-0 overflow-hidden border-border/60 bg-background"
      >
        <div className="relative shrink-0 border-b border-border/50 px-6 pt-6 pb-5 bg-background">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Field settings
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Edit label, placeholder, validation rules, calculations, and bindings for this field.
              <span className="block mt-1 text-xs opacity-90">Field: {field.id}</span>
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="general">
                  <Settings2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">General</span>
                </TabsTrigger>
                <TabsTrigger value="validations">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="truncate">Validations</span>
                </TabsTrigger>
                <TabsTrigger value="calculations">
                  <Sigma className="h-4 w-4 shrink-0" />
                  <span className="truncate">Calculations</span>
                </TabsTrigger>
                {isBindable && (
                  <TabsTrigger value="bindings">
                    <ArrowRight className="h-4 w-4 shrink-0" />
                    <span className="truncate">Bindings</span>
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="general" className="mt-5 space-y-5">
                <div className="space-y-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Display
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="field-settings-label"
                        className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                      >
                        Label
                      </label>
                      <Input
                        id="field-settings-label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="field-settings-placeholder"
                        className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                      >
                        Placeholder
                      </label>
                      <Input
                        id="field-settings-placeholder"
                        value={placeholder}
                        onChange={(e) => setPlaceholder(e.target.value)}
                        className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                      />
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
                    <span className="bg-white dark:bg-background px-2 text-muted-foreground">Constraints</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Getting Data from
                  </p>
                  {!gridId ? (
                    <p className="text-xs text-muted-foreground">
                      Place this field in a grid to see auto-population sources.
                    </p>
                  ) : autoPopulateSources.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No auto-population sources. Add mappings in bindings to populate this field.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {autoPopulateSources.map((path) => (
                        <div
                          key={path}
                          className="rounded-md border border-border/60 bg-muted/40 px-3 py-1 text-xs text-foreground/80"
                          title={path}
                        >
                          {resolvePathLabel(path, schema?.grids ?? [], schema?.fields ?? [])}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="field-settings-required"
                      checked={isRequired}
                      onCheckedChange={(v) => setIsRequired(Boolean(v))}
                    />
                    <label
                      htmlFor="field-settings-required"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Required
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="field-settings-data-type"
                      className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold block"
                    >
                      Data type
                    </label>
                    <Select value={dataType} onValueChange={(v) => setDataType(v as TrackerFieldType)}>
                      <SelectTrigger
                        id="field-settings-data-type"
                        className="h-10 w-full rounded-lg border-border/60 bg-background/90 max-w-xs"
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
                  {isNumeric && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="field-settings-min"
                          className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                        >
                          Min
                        </label>
                        <Input
                          id="field-settings-min"
                          type="number"
                          value={min}
                          onChange={(e) => setMin(e.target.value)}
                          className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="field-settings-max"
                          className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                        >
                          Max
                        </label>
                        <Input
                          id="field-settings-max"
                          type="number"
                          value={max}
                          onChange={(e) => setMax(e.target.value)}
                          className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                        />
                      </div>
                    </div>
                  )}
                  {isText && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="field-settings-min-length"
                          className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                        >
                          Min length
                        </label>
                        <Input
                          id="field-settings-min-length"
                          type="number"
                          value={minLength}
                          onChange={(e) => setMinLength(e.target.value)}
                          className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="field-settings-max-length"
                          className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                        >
                          Max length
                        </label>
                        <Input
                          id="field-settings-max-length"
                          type="number"
                          value={maxLength}
                          onChange={(e) => setMaxLength(e.target.value)}
                          className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              {isBindable && (
                <TabsContent value="bindings" className="mt-5 space-y-5">
                  {!gridId ? (
                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Bindings require this field to be placed in a grid.
                      </p>
                    </div>
                  ) : !bindingEnabled ? (
                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-4">
                      <p className="text-sm text-muted-foreground">
                        No binding yet. Bindings connect this select field to an options grid.
                      </p>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setBindingEnabled(true)
                          setBindingDraft(defaultBindingDraft())
                          setBindingDirty(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Create binding
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                          Select field
                        </p>
                        <div className="text-sm font-medium mt-1">
                          {resolvePathLabel(bindingKey, schema?.grids ?? [], schema?.fields ?? [])}
                        </div>
                        <div className="text-xs text-muted-foreground">{bindingKey}</div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase">
                            Options grid
                          </label>
                          {bindingDraft &&
                            renderBindingSelect(
                              bindingDraft.optionsGrid,
                              (val) => {
                                if (!bindingDraft) return
                                setBindingDraftValue({
                                  ...bindingDraft,
                                  optionsGrid: val,
                                })
                              },
                              allGridOptions.length > 0 ? allGridOptions : optionsGridOptions,
                              'Options grid'
                            )}
                          {bindingValidation.errors.optionsGrid && (
                            <div className="text-xs text-destructive">{bindingValidation.errors.optionsGrid}</div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase">
                            Label field
                          </label>
                          {bindingDraft &&
                            renderBindingSelect(
                              bindingDraft.labelField,
                              (val) => {
                                if (!bindingDraft) return
                                setBindingDraftValue({ ...bindingDraft, labelField: val })
                              },
                              bindingDraft.optionsGrid
                                ? getGridFieldOptions(bindingDraft.optionsGrid)
                                : allFieldPathOptions,
                              'Label field'
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
                        {!bindingValidation.isValid && bindingDirty && (
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
                            setBindingDirty(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove binding
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}
              <TabsContent value="calculations" className="mt-5 space-y-5">
                {!gridId ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Place this field in a grid to configure calculations.
                    </p>
                  </div>
                ) : !calculationRule ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No calculation configured. Add one expression to compute this field value.
                    </p>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setCalculationRule({ expr: defaultCalculationExpr })}
                    >
                      <Plus className="h-4 w-4" />
                      Add calculation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ExprRuleEditor
                      mode="calculation"
                      expr={calculationRule.expr}
                      gridId={gridId ?? ''}
                      fieldId={field.id}
                      availableFields={availableFields}
                      currentTracker={schema}
                      onChange={(nextExpr) => setCalculationRule({ expr: nextExpr })}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCalculationRule(null)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove calculation
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="validations" className="mt-5 space-y-5">
                {rules.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No validation rules. Add rules to validate this field on submit.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setRules((prev) => [...prev, { type: 'required' }])}
                      >
                        <Plus className="h-4 w-4" />
                        Add required
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setRules((prev) => [...prev, { type: 'min', value: 0 }])}
                      >
                        <Plus className="h-4 w-4" />
                        Add min/max
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setRules((prev) => [...prev, { type: 'required' }])}
                      >
                        <Plus className="h-4 w-4" />
                        Add rule
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {rules.map((rule, index) => (
                        <div
                          key={index}
                          id={`rule-card-${index}`}
                          className="rounded-lg border border-border/60 p-4 space-y-3 scroll-mt-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label
                                htmlFor={`rule-type-${index}`}
                                className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                              >
                                Type
                              </label>
                              <Select
                                value={rule.type}
                                onValueChange={(value) =>
                                  handleRuleTypeChange(index, value as FieldValidationRule['type'])
                                }
                              >
                                <SelectTrigger
                                  id={`rule-type-${index}`}
                                  className="mt-2 h-10 w-full rounded-lg border-border/60 bg-background/90"
                                >
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                                      Value rules
                                    </SelectLabel>
                                    <SelectItem value="required">{RULE_TYPE_LABELS.required}</SelectItem>
                                    <SelectItem value="min">{RULE_TYPE_LABELS.min}</SelectItem>
                                    <SelectItem value="max">{RULE_TYPE_LABELS.max}</SelectItem>
                                    <SelectItem value="minLength">{RULE_TYPE_LABELS.minLength}</SelectItem>
                                    <SelectItem value="maxLength">{RULE_TYPE_LABELS.maxLength}</SelectItem>
                                  </SelectGroup>
                                  <SelectGroup>
                                    <SelectLabel className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                                      Custom
                                    </SelectLabel>
                                    <SelectItem value="expr">{RULE_TYPE_LABELS.expr}</SelectItem>
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </div>
                            <button
                              type="button"
                              className="mt-6 h-9 w-9 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40"
                              onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))}
                              aria-label="Remove rule"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {(rule.type === 'min' ||
                            rule.type === 'max' ||
                            rule.type === 'minLength' ||
                            rule.type === 'maxLength') && (
                              <div className="space-y-2">
                                <label
                                  htmlFor={`rule-value-${index}`}
                                  className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                                >
                                  Value
                                </label>
                                <Input
                                  id={`rule-value-${index}`}
                                  type="number"
                                  value={String(rule.value ?? '')}
                                  onChange={(e) =>
                                    updateRule(index, {
                                      ...rule,
                                      value: toNumberOrUndefined(e.target.value) ?? 0,
                                    })
                                  }
                                  className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                                />
                              </div>
                            )}

                          {rule.type === 'expr' && (
                            <ExprRuleEditor
                              expr={rule.expr}
                              gridId={gridId ?? ''}
                              fieldId={field.id}
                              availableFields={availableFields}
                              currentTracker={schema}
                              onChange={(nextExpr) =>
                                updateRule(index, { ...(rules[index] as FieldValidationRule), type: 'expr', expr: nextExpr })
                              }
                            />
                          )}

                          <div className="space-y-2">
                            <label
                              htmlFor={`rule-message-${index}`}
                              className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                            >
                              Message
                            </label>
                            <Input
                              id={`rule-message-${index}`}
                              value={rule.message ?? ''}
                              onChange={(e) => updateRule(index, { ...rule, message: e.target.value })}
                              placeholder="Optional custom error message. Leave blank to use default message."
                              className="h-10 w-full rounded-lg border-border/60 bg-background/90"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setRules((prev) => [...prev, { type: 'required' }])}
                      >
                        <Plus className="h-4 w-4" />
                        Add required
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setRules((prev) => [...prev, { type: 'min', value: 0 }])}
                      >
                        <Plus className="h-4 w-4" />
                        Add min/max
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setRules((prev) => [...prev, { type: 'required' }])}
                      >
                        <Plus className="h-4 w-4" />
                        Add rule
                      </Button>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-border/60 space-y-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setStructureOpen((prev) => !prev)}
                    aria-expanded={structureOpen}
                  >
                    {structureOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    {structureOpen ? 'Hide rule summary' : 'View rule summary'}
                  </button>
                  {structureOpen && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Click a rule to jump to it in the form above. Changes in the form update this summary.
                      </p>
                      {rules.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic py-2">No rules yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {rules.map((rule, index) => (
                            <li key={index}>
                              <button
                                type="button"
                                className="w-full flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-left hover:bg-muted/40 hover:border-border transition-colors"
                                onClick={() => {
                                  document.getElementById(`rule-card-${index}`)?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                  })
                                }}
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-sm">{RULE_TYPE_LABELS[rule.type]}</span>
                                  <span className="text-muted-foreground text-sm ml-2">
                                    {rule.type !== 'required' && rule.type !== 'expr' && (
                                      <>→ {String(rule.value ?? 0)}</>
                                    )}
                                  </span>
                                  {rule.message && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate" title={rule.message}>
                                      “{rule.message}”
                                    </p>
                                  )}
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="pt-2 border-t border-border/40">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setShowJsonInStructure((prev) => !prev)}
                          aria-expanded={showJsonInStructure}
                        >
                          {showJsonInStructure ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          {showJsonInStructure ? 'Hide raw JSON' : 'See raw JSON'}
                        </button>
                        {showJsonInStructure && (
                          <div className="relative mt-2">
                            <pre className="rounded-lg border border-border/60 bg-muted/30 p-4 font-mono text-xs overflow-x-auto min-h-[100px] max-h-[180px] overflow-y-auto">
                              {JSON.stringify(rules, null, 2)}
                            </pre>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-7 gap-1 text-muted-foreground hover:text-foreground text-xs"
                              onClick={() => {
                                void navigator.clipboard.writeText(JSON.stringify(rules, null, 2))
                              }}
                            >
                              <Copy className="h-3 w-3" />
                              Copy
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <DialogFooter className="shrink-0 flex-row justify-end gap-2 px-6 py-4 border-t border-border/50 bg-white dark:bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="min-w-[84px]"
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="min-w-[104px]" disabled={disableSave ?? false}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
