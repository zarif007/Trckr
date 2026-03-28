'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { ExprRuleEditor } from '../expr/ExprRuleEditor'
import { NodeTriggerSelector } from './NodeTriggerSelector'
import { PropertySelector } from './PropertySelector'
import type { AvailableField } from '../expr/expr-types'
import type { TrackerDisplayProps } from '../../types'
import type { FieldRuleV2 } from '@/lib/field-rules-v2/types'
import type { ExprNode } from '@/lib/functions/types'

// Minimal placeholder expression used when a rule has no condition/outcome yet.
const EMPTY_EXPR: ExprNode = { op: 'const', value: null } as unknown as ExprNode

interface FieldRuleV2EditorProps {
  rule: FieldRuleV2
  gridId: string
  fieldId: string
  availableFields: AvailableField[]
  currentTracker?: TrackerDisplayProps
  trackerSchemaId?: string | null
  onChange: (rule: FieldRuleV2) => void
}

export function FieldRuleV2Editor({
  rule,
  gridId,
  fieldId,
  availableFields,
  currentTracker,
  trackerSchemaId,
  onChange,
}: FieldRuleV2EditorProps) {
  const [showCondition, setShowCondition] = useState(Boolean(rule.condition))

  function patch(updates: Partial<FieldRuleV2>) {
    onChange({ ...rule, ...updates })
  }

  return (
    <div className="space-y-4 py-1">
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Trigger</span>
        <NodeTriggerSelector value={rule.trigger} onChange={(trigger) => patch({ trigger })} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Condition (optional)</span>
          <button
            type="button"
            onClick={() => {
              const next = !showCondition
              setShowCondition(next)
              if (!next) patch({ condition: undefined })
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {showCondition ? 'Remove' : 'Add condition'}
          </button>
        </div>
        {showCondition ? (
          <ExprRuleEditor
            expr={(rule.condition ?? EMPTY_EXPR) as ExprNode}
            gridId={gridId}
            fieldId={fieldId}
            availableFields={availableFields}
            currentTracker={currentTracker}
            trackerSchemaId={trackerSchemaId}
            mode="validation"
            onChange={(condition) => patch({ condition })}
          />
        ) : (
          <p className="text-[11px] text-muted-foreground">Rule fires every time the trigger activates.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Affects</span>
        <PropertySelector
          value={rule.property}
          onChange={(property, engineType) => patch({ property, engineType })}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Set to</span>
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
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <span className="text-xs text-muted-foreground">Rule name (optional)</span>
          <Input
            className={cn(theme.patterns.inputBase, 'h-7 text-xs')}
            placeholder="e.g. Hide when closed"
            value={rule.label ?? ''}
            onChange={(e) => patch({ label: e.target.value || undefined })}
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Checkbox
            id={`rule-enabled-${rule.id}`}
            checked={rule.enabled}
            onCheckedChange={(checked) => patch({ enabled: checked === true })}
          />
          <label htmlFor={`rule-enabled-${rule.id}`} className="text-xs text-muted-foreground cursor-pointer">
            Enabled
          </label>
        </div>
      </div>
    </div>
  )
}
