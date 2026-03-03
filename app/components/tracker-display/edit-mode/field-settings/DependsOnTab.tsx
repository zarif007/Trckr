'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldWrapper } from '../../shared/FieldWrapper'
import { FIELD_INNER_INPUT_BASE_CLASS } from '@/lib/style-utils'
import type { DependsOnRuleForTarget } from '@/lib/depends-on'
import { DEPENDS_ON_OPERATORS } from '@/lib/dynamic-options/functions/all-operators'
import { DEPENDS_ON_ACTIONS } from '@/lib/dynamic-options/functions/all-actions'
import { DEPENDS_ON_SET_OPTIONS } from '@/lib/dynamic-options/functions/all-rule-set-values'
import {
  DEPENDS_ON_ACTION_LABELS,
  DEPENDS_ON_OPERATOR_LABELS,
} from './constants'
import type { TrackerField } from '../../types'

const DEFAULT_RULE: DependsOnRuleForTarget = {
  source: '',
  operator: 'eq',
  value: undefined,
  action: 'isHidden',
  set: true,
}

export interface DependsOnTabProps {
  gridId: string
  field: TrackerField
  dependsOnRules: DependsOnRuleForTarget[]
  setDependsOnRules: React.Dispatch<React.SetStateAction<DependsOnRuleForTarget[]>>
  allFieldPathOptions: Array<{ value: string; label: string }>
  pathLabelMap: Map<string, string>
  resolvePathLabelFn: (path: string) => string
}

export function DependsOnTab({
  gridId,
  field,
  dependsOnRules,
  setDependsOnRules,
  allFieldPathOptions,
  pathLabelMap,
  resolvePathLabelFn,
}: DependsOnTabProps) {
  const currentFieldPath = `${gridId}.${field.id}`
  const thisFieldLabel = field.ui?.label || field.id

  if (dependsOnRules.length === 0) {
    return (
      <div
        className={cn(
          'rounded-md border-2 border-dashed border-border/70 bg-muted/20 py-10 px-6 text-center',
          'hover:border-primary/30 hover:bg-muted/30 transition-colors'
        )}
      >
        <p className="text-sm font-medium text-foreground/90 mb-1">No conditions yet</p>
        <p className="text-xs text-muted-foreground mb-5">
          Add a condition: when another field matches a value, an action will apply to “{thisFieldLabel}”.
        </p>
        <Button
          size="sm"
          className="gap-2 shadow-sm"
          onClick={() => setDependsOnRules((prev) => [...prev, { ...DEFAULT_RULE }])}
        >
          <Plus className="h-4 w-4" />
          Add condition
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {dependsOnRules.map((rule, index) => {
          const sourceOptions = allFieldPathOptions.filter((o) => o.value !== currentFieldPath)
          const sourceLabel =
            rule.source &&
            (pathLabelMap.get(rule.source) ?? resolvePathLabelFn(rule.source))
          const needsValue =
            rule.operator !== 'is_empty' && rule.operator !== 'not_empty'
          return (
            <div
              key={index}
              className="rounded-md border border-border/60 bg-card overflow-hidden"
            >
              <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b border-border/60">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Condition {index + 1}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => setDependsOnRules((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Remove condition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Field to watch
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {rule.source ? (
                      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 border border-border/60">
                        <span
                          className="text-sm font-medium truncate max-w-[200px]"
                          title={sourceLabel}
                        >
                          {sourceLabel}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-medium text-primary/80 hover:text-primary hover:underline"
                          onClick={() =>
                            setDependsOnRules((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, source: '' } : r))
                            )
                          }
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <SearchableSelect
                        options={sourceOptions}
                        value="__empty__"
                        onValueChange={(val) =>
                          setDependsOnRules((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, source: val === '__empty__' ? '' : val } : r
                            )
                          )
                        }
                        placeholder="Choose a field to watch"
                        searchPlaceholder="Search fields"
                        className="h-9 min-w-[200px] max-w-[280px] text-sm"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    The other field whose value we check (e.g. Status, Type).
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Matches
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <FieldWrapper className="w-[130px]">
                      <Select
                        value={rule.operator ?? 'eq'}
                        onValueChange={(val) =>
                          setDependsOnRules((prev) =>
                            prev.map((r, i) => (i === index ? { ...r, operator: val as typeof r.operator } : r))
                          )
                        }
                      >
                        <SelectTrigger className={cn(FIELD_INNER_INPUT_BASE_CLASS, 'h-9 w-full text-sm px-3')}>
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                        {DEPENDS_ON_OPERATORS.map((op) => (
                          <SelectItem key={op} value={op}>
                            {DEPENDS_ON_OPERATOR_LABELS[op] ?? op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </FieldWrapper>
                    {needsValue && (
                      <FieldWrapper className="w-[160px]">
                        <Input
                          value={rule.value != null ? String(rule.value) : ''}
                          onChange={(e) =>
                            setDependsOnRules((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, value: e.target.value || undefined } : r))
                            )
                          }
                          placeholder="Value"
                          className={cn(FIELD_INNER_INPUT_BASE_CLASS, 'h-9 w-full text-sm px-3')}
                        />
                      </FieldWrapper>
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-md border-l-4 border-amber-400/60 pl-4 bg-amber-50/50 dark:bg-amber-950/20 py-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Then apply to “{thisFieldLabel}”
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <FieldWrapper className="w-[140px]">
                      <Select
                        value={rule.action ?? 'isHidden'}
                        onValueChange={(val) =>
                          setDependsOnRules((prev) =>
                            prev.map((r, i) => (i === index ? { ...r, action: val as typeof r.action } : r))
                          )
                        }
                      >
                        <SelectTrigger className={cn(FIELD_INNER_INPUT_BASE_CLASS, 'h-9 w-full text-sm px-3')}>
                          <SelectValue placeholder="Action" />
                        </SelectTrigger>
                      <SelectContent>
                        {DEPENDS_ON_ACTIONS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {DEPENDS_ON_ACTION_LABELS[a]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </FieldWrapper>
                    <FieldWrapper className="w-[100px]">
                      <Select
                        value={
                          rule.set === true || rule.set === 'true'
                            ? 'true'
                            : rule.set === false || rule.set === 'false'
                              ? 'false'
                              : 'true'
                        }
                        onValueChange={(val) =>
                          setDependsOnRules((prev) =>
                            prev.map((r, i) => (i === index ? { ...r, set: val === 'true' } : r))
                          )
                        }
                      >
                        <SelectTrigger className={cn(FIELD_INNER_INPUT_BASE_CLASS, 'h-9 w-full text-sm px-3')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPENDS_ON_SET_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldWrapper>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-dashed"
        onClick={() => setDependsOnRules((prev) => [...prev, { ...DEFAULT_RULE }])}
      >
        <Plus className="h-4 w-4" />
        Add condition
      </Button>
    </>
  )
}
