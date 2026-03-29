'use client'

import { useMemo } from 'react'
import { Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { ExprRuleEditor } from '../expr/ExprRuleEditor'
import { NodeTriggerSelector } from './NodeTriggerSelector'
import { PropertySelector } from './PropertySelector'
import type { AvailableField } from '../expr/expr-types'
import type { TrackerDisplayProps } from '../../types'
import type { FieldRule } from '@/lib/field-rules'
import { extractFieldRefsFromExpr } from '@/lib/field-rules'
import type { ExprNode } from '@/lib/functions/types'

const EMPTY_EXPR: ExprNode = { op: 'const', value: null } as unknown as ExprNode

interface FieldRuleEditorProps {
  rule: FieldRule
  gridId: string
  fieldId: string
  availableFields: AvailableField[]
  currentTracker?: TrackerDisplayProps
  trackerSchemaId?: string | null
  onChange: (rule: FieldRule) => void
}

export function FieldRuleV2Editor({
  rule,
  gridId,
  fieldId,
  availableFields,
  currentTracker,
  trackerSchemaId,
  onChange,
}: FieldRuleEditorProps) {
  const watchedFields = useMemo(() => {
    if (rule.trigger !== 'onFieldChange') return []
    const refs = new Set([
      ...extractFieldRefsFromExpr(rule.condition as ExprNode),
      ...extractFieldRefsFromExpr(rule.outcome as ExprNode),
    ])
    return Array.from(refs).map((ref) => {
      const match = availableFields.find((f) => f.fieldId === ref)
      return { ref, label: match?.label ?? ref.split('.').pop() ?? ref }
    })
  }, [rule.trigger, rule.condition, rule.outcome, availableFields])

  function patch(updates: Partial<FieldRule>) {
    onChange({ ...rule, ...updates })
  }

  return (
    <div className="space-y-3 py-1">
      {/* Trigger + Property */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Trigger</span>
          <NodeTriggerSelector value={rule.trigger} onChange={(trigger) => patch({ trigger })} />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Affects</span>
          <PropertySelector
            value={rule.property}
            onChange={(property, engineType) => patch({ property, engineType })}
          />
        </div>
      </div>

      {/* Watched fields — auto-detected for onFieldChange */}
      {rule.trigger === 'onFieldChange' && (
        <div className={cn('rounded-md border px-3 py-2 flex items-center gap-2', theme.border.default)}>
          <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Watching:</span>
          {watchedFields.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {watchedFields.map(({ ref, label }) => (
                <span
                  key={ref}
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-muted/50 text-foreground/70"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground italic">reference fields in your expression to watch them</span>
          )}
        </div>
      )}

      {/* Expression */}
      <ExprRuleEditor
        expr={(rule.outcome ?? EMPTY_EXPR) as ExprNode}
        gridId={gridId}
        fieldId={fieldId}
        availableFields={availableFields}
        currentTracker={currentTracker}
        trackerSchemaId={trackerSchemaId}
        mode="field-rule"
        onChange={(outcome) => patch({ outcome })}
      />

      {/* Rule name + enabled */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            className={cn(theme.patterns.inputBase, 'h-7 text-xs')}
            placeholder="Rule name (optional)"
            value={rule.label ?? ''}
            onChange={(e) => patch({ label: e.target.value || undefined })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`rule-enabled-${rule.id}`}
            checked={rule.enabled}
            onCheckedChange={(checked) => patch({ enabled: checked === true })}
          />
          <label
            htmlFor={`rule-enabled-${rule.id}`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Enabled
          </label>
        </div>
      </div>
    </div>
  )
}
