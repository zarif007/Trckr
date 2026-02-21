'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Settings2, ShieldCheck } from 'lucide-react'
import type { TrackerDisplayProps, TrackerFieldConfig } from '../types'
import type { FieldValidationRule, ExprNode } from '@/lib/functions/types'
import { FIELD_TYPE_LABELS } from './utils'
import type { TrackerFieldType } from '../types'
import { ExprRuleEditor } from './ExprRuleEditor'

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
  /** When set, validations are keyed by gridId.fieldId (like bindings). */
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
  const [isRequired, setIsRequired] = useState(false)
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [minLength, setMinLength] = useState('')
  const [maxLength, setMaxLength] = useState('')
  const [rules, setRules] = useState<FieldValidationRule[]>([])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [exprDrafts, setExprDrafts] = useState<Record<number, string>>({})

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

  useEffect(() => {
    if (!open || !field) return
    setLabel(field.ui.label ?? '')
    setPlaceholder(field.ui.placeholder ?? '')
    setIsRequired(Boolean(field.config?.isRequired))
    setMin(field.config?.min != null ? String(field.config.min) : '')
    setMax(field.config?.max != null ? String(field.config.max) : '')
    setMinLength(field.config?.minLength != null ? String(field.config.minLength) : '')
    setMaxLength(field.config?.maxLength != null ? String(field.config.maxLength) : '')

    const validationKey = gridId ? `${gridId}.${field.id}` : ''
    const nextRules = (schema?.validations?.[validationKey] ?? []).map(ensureRuleDefaults)
    setRules(nextRules)
    setJsonDraft(JSON.stringify(nextRules, null, 2))
    setJsonError(null)
    setAdvancedOpen(false)
  }, [open, field, schema, gridId])

  useEffect(() => {
    if (!advancedOpen) {
      setJsonDraft(JSON.stringify(rules, null, 2))
    }
  }, [rules, advancedOpen])

  if (!open || !field || !schema || !onSchemaChange) return null

  const updateRule = (index: number, nextRule: FieldValidationRule) => {
    setRules((prev) => prev.map((r, i) => (i === index ? ensureRuleDefaults(nextRule) : r)))
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

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft)
      if (!Array.isArray(parsed)) {
        setJsonError('JSON must be an array of rules')
        return
      }
      const nextRules = parsed.map(ensureRuleDefaults) as FieldValidationRule[]
      setRules(nextRules)
      setJsonError(null)
    } catch {
      setJsonError('Invalid JSON')
    }
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

    onSchemaChange({
      ...schema,
      fields: nextFields,
      validations: Object.keys(nextValidations).length > 0 ? nextValidations : undefined,
    })

    onOpenChange(false)
  }

  const isNumeric = NUMERIC_TYPES.includes(field.dataType)
  const isText = TEXT_TYPES.includes(field.dataType)
  const typeLabel = FIELD_TYPE_LABELS[field.dataType] ?? field.dataType

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
              Edit label, placeholder, and validation rules for this field.
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
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Type: {typeLabel}
                  </p>
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
                        <div key={index} className="rounded-lg border border-border/60 p-4 space-y-3">
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
                                  <SelectValue />
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
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setAdvancedOpen((prev) => !prev)}
                  >
                    {advancedOpen ? 'Hide advanced JSON' : 'Show advanced JSON'}
                  </button>
                  {advancedOpen && (
                    <div className="space-y-2">
                      <Textarea
                        value={jsonDraft}
                        onChange={(e) => setJsonDraft(e.target.value)}
                        className="font-mono text-xs min-h-[160px]"
                        aria-invalid={Boolean(jsonError)}
                        aria-describedby={jsonError ? 'advanced-json-error' : undefined}
                      />
                      {jsonError && (
                        <p id="advanced-json-error" className="text-xs text-destructive">
                          {jsonError}
                        </p>
                      )}
                      <Button type="button" variant="secondary" size="sm" onClick={handleApplyJson}>
                        Apply JSON
                      </Button>
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
          <Button size="sm" onClick={handleSave} className="min-w-[104px]">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
