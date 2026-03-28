'use client'

import { useState } from 'react'
import { ArrowUpDown, Check, Code2, ShieldCheck, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { RuleCardShell, RuleEmptyState } from '../shared'
import { ExprRuleEditor } from '../expr'
import { RULE_TYPE_LABELS, toNumberOrUndefined } from './constants'
import type { FieldValidationRule } from '@/lib/functions/types'
import type { TrackerDisplayProps, TrackerField } from '../../types'

// ---- Per-type visual config ----
type RuleTypeConfig = {
  icon: React.ElementType
  badgeClass: string
  previewValue: (rule: FieldValidationRule) => string
}

const RULE_TYPE_CONFIG: Record<FieldValidationRule['type'], RuleTypeConfig> = {
  required: {
    icon: Check,
    badgeClass: 'bg-red-500/10 border-red-500/25 text-red-400',
    previewValue: () => '',
  },
  min: {
    icon: ArrowUpDown,
    badgeClass: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
    previewValue: (r) => (r.type === 'min' ? `→ ${r.value}` : ''),
  },
  max: {
    icon: ArrowUpDown,
    badgeClass: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
    previewValue: (r) => (r.type === 'max' ? `→ ${r.value}` : ''),
  },
  minLength: {
    icon: ArrowUpDown,
    badgeClass: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
    previewValue: (r) => (r.type === 'minLength' ? `→ ${r.value} chars` : ''),
  },
  maxLength: {
    icon: ArrowUpDown,
    badgeClass: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
    previewValue: (r) => (r.type === 'maxLength' ? `→ ${r.value} chars` : ''),
  },
  expr: {
    icon: Code2,
    badgeClass: 'bg-purple-500/10 border-purple-500/25 text-purple-400',
    previewValue: () => 'custom expression',
  },
}

export interface ValidationsTabProps {
  gridId: string | null | undefined
  schema: TrackerDisplayProps | undefined
  field: TrackerField
  rules: FieldValidationRule[]
  setRules: React.Dispatch<React.SetStateAction<FieldValidationRule[]>>
  updateRule: (index: number, nextRule: FieldValidationRule) => void
  handleRuleTypeChange: (index: number, nextType: FieldValidationRule['type']) => void
  availableFields: Array<{ fieldId: string; label: string; dataType?: string }>
  trackerSchemaId?: string | null
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
  trackerSchemaId,
}: ValidationsTabProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  function toggleExpanded(index: number) {
    setExpandedIndex((prev) => (prev === index ? null : index))
  }

  function handleAdd() {
    setRules((prev) => [...prev, { type: 'required', enabled: true }])
    setExpandedIndex(rules.length) // open the new card
  }

  if (rules.length === 0) {
    return (
      <RuleEmptyState
        icon={<ShieldCheck className="h-5 w-5 text-muted-foreground" />}
        title="No validation rules"
        description="Add rules to validate this field when the form is submitted."
        action={{ label: 'Add rule', onClick: handleAdd }}
      />
    )
  }

  return (
    <div className="space-y-2">
      {rules.map((rule, index) => {
        const config = RULE_TYPE_CONFIG[rule.type]
        const TypeIcon = config.icon
        const preview = config.previewValue(rule)
        const subtitle = rule.message ? `"${rule.message}"` : preview

        const icon = (
          <div
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-[4px] shrink-0',
              rule.enabled !== false ? config.badgeClass : 'bg-muted text-muted-foreground'
            )}
          >
            <TypeIcon className="h-3 w-3" />
          </div>
        )

        const badges = (
          <>
            <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5 shrink-0', config.badgeClass)}>
              {RULE_TYPE_LABELS[rule.type]}
            </Badge>
            {subtitle && (
              <span className="text-[11px] text-muted-foreground truncate">{subtitle}</span>
            )}
          </>
        )

        const actions = (
          <>
            <Checkbox
              checked={rule.enabled !== false}
              onCheckedChange={(checked) =>
                updateRule(index, { ...rule, enabled: checked === true })
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )

        return (
          <div key={index} className={cn(rule.enabled === false && 'opacity-50')}>
            <RuleCardShell
              icon={icon}
              badges={badges}
              actions={actions}
              expanded={expandedIndex === index}
              onToggle={() => toggleExpanded(index)}
            >
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <Select
                      value={rule.type}
                      onValueChange={(value) =>
                        handleRuleTypeChange(index, value as FieldValidationRule['type'])
                      }
                    >
                      <SelectTrigger className={cn(theme.patterns.inputBase, 'h-7 text-xs')}>
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

                  {(rule.type === 'min' ||
                    rule.type === 'max' ||
                    rule.type === 'minLength' ||
                    rule.type === 'maxLength') && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground">Value</span>
                      <Input
                        type="number"
                        value={String(rule.value ?? '')}
                        onChange={(e) =>
                          updateRule(index, {
                            ...rule,
                            value: toNumberOrUndefined(e.target.value) ?? 0,
                          })
                        }
                        className={cn(theme.patterns.inputBase, 'h-7 text-xs')}
                      />
                    </div>
                  )}
                </div>

                {rule.type === 'expr' && (
                  <ExprRuleEditor
                    expr={rule.expr}
                    gridId={gridId ?? ''}
                    fieldId={field.id}
                    availableFields={availableFields}
                    currentTracker={schema}
                    trackerSchemaId={trackerSchemaId}
                    onChange={(nextExpr) =>
                      updateRule(index, { ...rule, type: 'expr', expr: nextExpr })
                    }
                  />
                )}

                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Error message (optional)</span>
                  <Input
                    value={rule.message ?? ''}
                    onChange={(e) => updateRule(index, { ...rule, message: e.target.value })}
                    placeholder="Leave blank for default message"
                    className={cn(theme.patterns.inputBase, 'h-7 text-xs')}
                  />
                </div>
              </div>
            </RuleCardShell>
          </div>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 gap-1.5 text-xs border-dashed"
        onClick={handleAdd}
      >
        + Add validation rule
      </Button>
    </div>
  )
}
