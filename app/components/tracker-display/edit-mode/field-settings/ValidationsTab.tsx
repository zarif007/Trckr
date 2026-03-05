'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowRight, Copy } from 'lucide-react'
import { FieldWrapper } from '../../shared/FieldWrapper'
import { FIELD_FORM_INPUT_CLASS } from '@/lib/style-utils'
import type { FieldValidationRule } from '@/lib/functions/types'
import type { TrackerDisplayProps, TrackerField } from '../../types'
import { ExprRuleEditor } from '../expr'
import { RULE_TYPE_LABELS, toNumberOrUndefined } from './constants'

export interface ValidationsTabProps {
  gridId: string | null | undefined
  schema: TrackerDisplayProps | undefined
  field: TrackerField
  rules: FieldValidationRule[]
  setRules: React.Dispatch<React.SetStateAction<FieldValidationRule[]>>
  updateRule: (index: number, nextRule: FieldValidationRule) => void
  handleRuleTypeChange: (index: number, nextType: FieldValidationRule['type']) => void
  availableFields: Array<{ fieldId: string; label: string; dataType?: string }>
  structureOpen: boolean
  setStructureOpen: React.Dispatch<React.SetStateAction<boolean>>
  showJsonInStructure: boolean
  setShowJsonInStructure: React.Dispatch<React.SetStateAction<boolean>>
}

export function ValidationsTab({
  gridId,
  schema,
  field,
  rules,
  setRules,
  updateRule,
  handleRuleTypeChange,
  availableFields,
  structureOpen,
  setStructureOpen,
  showJsonInStructure,
  setShowJsonInStructure,
}: ValidationsTabProps) {
  const addRuleButtons = (
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
  )

  return (
    <div className="space-y-5">
      {rules.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            No validation rules. Add rules to validate this field on submit.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {addRuleButtons}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {rules.map((rule, index) => (
          <div
            key={index}
            id={`rule-card-${index}`}
            className="rounded-md border border-border/60 p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label
                  htmlFor={`rule-type-${index}`}
                  className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
                >
                  Type
                </label>
                <FieldWrapper className="mt-2">
                  <Select
                    value={rule.type}
                    onValueChange={(value) =>
                      handleRuleTypeChange(index, value as FieldValidationRule['type'])
                    }
                  >
                    <SelectTrigger
                      id={`rule-type-${index}`}
                      className={FIELD_FORM_INPUT_CLASS}
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
                </FieldWrapper>
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
                <FieldWrapper>
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
                    className={FIELD_FORM_INPUT_CLASS}
                  />
                </FieldWrapper>
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
              <FieldWrapper>
                <Input
                  id={`rule-message-${index}`}
                  value={rule.message ?? ''}
                  onChange={(e) => updateRule(index, { ...rule, message: e.target.value })}
                  placeholder="Optional custom error message. Leave blank to use default message."
                  className={FIELD_FORM_INPUT_CLASS}
                />
              </FieldWrapper>
            </div>
          </div>
        ))}
          </div>
          {addRuleButtons}
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
                      className="w-full flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-4 py-3 text-left hover:bg-muted/40 hover:border-border transition-colors"
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
                            &ldquo;{rule.message}&rdquo;
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
                  <pre className="rounded-md border border-border/60 bg-muted/30 p-4 font-mono text-xs overflow-x-auto min-h-[100px] max-h-[180px] overflow-y-auto">
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
    </div>
  )
}
