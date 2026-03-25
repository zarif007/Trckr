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
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Eye, Filter, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
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
          theme.radius.md,
          theme.border.subtle,
          'border-2 border-dashed bg-muted/20 py-12 px-6 text-center',
          'hover:border-primary/40 hover:bg-muted/30 transition-colors duration-200'
        )}
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1.5">No visibility conditions</p>
        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto mb-6 leading-relaxed">
          When another field matches a value, show, hide, require, or disable “{thisFieldLabel}”.
        </p>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setDependsOnRules((prev) => [...prev, { ...DEFAULT_RULE }])}
        >
          <Plus className="h-4 w-4" />
          Add condition
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {dependsOnRules.map((rule, index) => {
          const sourceOptions = allFieldPathOptions.filter((o) => o.value !== currentFieldPath)
          const sourceLabel =
            rule.source &&
            (pathLabelMap.get(rule.source) ?? resolvePathLabelFn(rule.source))
          const needsValue =
            rule.operator !== 'is_empty' && rule.operator !== 'not_empty'
          return (
            <article
              key={index}
              className={cn(
                theme.surface.card,
                theme.border.subtle,
                theme.radius.md,
                'border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
              )}
            >
              <header className={cn('flex items-center justify-between gap-3 px-4 py-3', theme.surface.mutedSubtle, theme.border.subtle, 'border-b')}>
                <Badge variant="secondary" className="text-[11px] font-medium uppercase tracking-wide px-2.5 py-0.5">
                  Condition {index + 1}
                </Badge>
                <button
                  type="button"
                  className={cn(
                    'shrink-0 rounded-md p-2 -m-1 text-muted-foreground',
                    'hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors outline-none'
                  )}
                  onClick={() => setDependsOnRules((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Remove condition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </header>

              <div className="p-4 space-y-5">
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="text-xs font-semibold text-foreground">Field to watch</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {rule.source ? (
                      <div className={cn('flex items-center gap-2 rounded-md border px-3 py-2 min-h-9', theme.border.subtle, theme.surface.mutedSubtle)}>
                        <span
                          className="text-sm font-medium truncate max-w-[200px]"
                          title={sourceLabel}
                        >
                          {sourceLabel}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-medium text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1 -mx-1"
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
                        placeholder="Choose a field…"
                        searchPlaceholder="Search fields…"
                        className="h-9 min-w-[200px] max-w-[280px] text-sm"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    The field whose value is checked (e.g. Status, Type).
                  </p>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="text-xs font-semibold text-foreground">When value</span>
                  </div>
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
                </section>

                <section
                  className={cn(
                    'space-y-2 rounded-md border-l-4 pl-4 py-3',
                    theme.status.info.bg,
                    'border-l-info/60'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="text-xs font-semibold text-foreground">
                      Then for “{thisFieldLabel}”
                    </span>
                  </div>
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
                </section>
              </div>
            </article>
          )
        })}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-dashed w-full sm:w-auto"
        onClick={() => setDependsOnRules((prev) => [...prev, { ...DEFAULT_RULE }])}
      >
        <Plus className="h-4 w-4" />
        Add another condition
      </Button>
    </div>
  )
}
