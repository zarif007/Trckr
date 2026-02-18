'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import type { TrackerDisplayProps, TrackerFieldConfig } from '../types'
import type { FieldValidationRule, ExprNode } from '@/lib/functions/types'

const RULE_TYPES: Array<FieldValidationRule['type']> = [
  'required',
  'min',
  'max',
  'minLength',
  'maxLength',
  'expr',
]

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
  const [exprDrafts, setExprDrafts] = useState<Record<number, string>>({})
  const [exprErrors, setExprErrors] = useState<Record<number, string>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !field) return
    setLabel(field.ui.label ?? '')
    setPlaceholder(field.ui.placeholder ?? '')
    setIsRequired(Boolean(field.config?.isRequired))
    setMin(field.config?.min != null ? String(field.config.min) : '')
    setMax(field.config?.max != null ? String(field.config.max) : '')
    setMinLength(field.config?.minLength != null ? String(field.config.minLength) : '')
    setMaxLength(field.config?.maxLength != null ? String(field.config.maxLength) : '')

    const validationKey = gridId ? `${gridId}.${field.id}` : field.id
    const nextRules = (schema?.validations?.[validationKey] ?? schema?.validations?.[field.id] ?? []).map(ensureRuleDefaults)
    setRules(nextRules)
    const nextExprDrafts: Record<number, string> = {}
    nextRules.forEach((rule, idx) => {
      if (rule.type === 'expr') {
        nextExprDrafts[idx] = JSON.stringify(rule.expr, null, 2)
      }
    })
    setExprDrafts(nextExprDrafts)
    setExprErrors({})
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

  const handleExprChange = (index: number, nextText: string) => {
    setExprDrafts((prev) => ({ ...prev, [index]: nextText }))
  }

  const handleExprBlur = (index: number) => {
    const draft = exprDrafts[index]
    if (draft == null) return
    try {
      const parsed = JSON.parse(draft) as ExprNode
      updateRule(index, { ...(rules[index] as FieldValidationRule), type: 'expr', expr: parsed })
      setExprErrors((prev) => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    } catch (err) {
      setExprErrors((prev) => ({ ...prev, [index]: 'Invalid JSON expression' }))
    }
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
      const nextExprDrafts: Record<number, string> = {}
      nextRules.forEach((rule, idx) => {
        if (rule.type === 'expr') {
          nextExprDrafts[idx] = JSON.stringify(rule.expr, null, 2)
        }
      })
      setExprDrafts(nextExprDrafts)
      setExprErrors({})
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

    const validationKey = gridId ? `${gridId}.${field.id}` : field.id
    const nextValidations = { ...(schema.validations ?? {}) }
    if (rules.length > 0) {
      nextValidations[validationKey] = rules
    } else {
      delete nextValidations[validationKey]
    }
    if (validationKey !== field.id) delete nextValidations[field.id]

    onSchemaChange({
      ...schema,
      fields: nextFields,
      validations: Object.keys(nextValidations).length > 0 ? nextValidations : undefined,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Field settings</DialogTitle>
            <p className="text-xs text-muted-foreground">Field: {field.id}</p>
          </DialogHeader>
        </div>
        <div className="px-6 py-5">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="validations">Validations</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">Label</label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">Placeholder</label>
                  <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={isRequired} onCheckedChange={(v) => setIsRequired(Boolean(v))} />
                <span className="text-sm">Required</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">Min</label>
                  <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">Max</label>
                  <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">Min length</label>
                  <Input type="number" value={minLength} onChange={(e) => setMinLength(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">Max length</label>
                  <Input type="number" value={maxLength} onChange={(e) => setMaxLength(e.target.value)} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="validations" className="mt-5 space-y-4">
              {rules.length === 0 && (
                <p className="text-sm text-muted-foreground">No validation rules yet.</p>
              )}
              <div className="space-y-4">
                {rules.map((rule, index) => (
                  <div key={index} className="rounded-lg border border-border/60 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-semibold uppercase tracking-wide">Type</label>
                        <Select
                          value={rule.type}
                          onValueChange={(value) => handleRuleTypeChange(index, value as FieldValidationRule['type'])}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
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

                    {(rule.type === 'min' || rule.type === 'max' || rule.type === 'minLength' || rule.type === 'maxLength') && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide">Value</label>
                        <Input
                          type="number"
                          value={String(rule.value ?? '')}
                          onChange={(e) =>
                            updateRule(index, { ...rule, value: toNumberOrUndefined(e.target.value) ?? 0 })
                          }
                        />
                      </div>
                    )}

                    {rule.type === 'expr' && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide">Expression (JSON)</label>
                        <Textarea
                          value={exprDrafts[index] ?? JSON.stringify(rule.expr, null, 2)}
                          onChange={(e) => handleExprChange(index, e.target.value)}
                          onBlur={() => handleExprBlur(index)}
                          className="font-mono text-xs min-h-[120px]"
                        />
                        {exprErrors[index] && (
                          <p className="text-xs text-destructive">{exprErrors[index]}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide">Message</label>
                      <Input
                        value={rule.message ?? ''}
                        onChange={(e) => updateRule(index, { ...rule, message: e.target.value })}
                        placeholder="Optional custom error message"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setRules((prev) => [...prev, { type: 'required' }])}
              >
                <Plus className="h-4 w-4" />
                Add rule
              </Button>

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
                    />
                    {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                    <Button type="button" variant="secondary" onClick={handleApplyJson}>
                      Apply JSON
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
