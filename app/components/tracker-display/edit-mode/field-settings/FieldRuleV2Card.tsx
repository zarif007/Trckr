'use client'

import { useState } from 'react'
import { Trash2, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { RuleCardShell } from '../shared'
import { FieldRuleV2Editor } from './FieldRuleV2Editor'
import type { AvailableField } from '../expr/expr-types'
import type { TrackerDisplayProps } from '../../types'
import type { FieldRule, NodeTriggerType, RuleProperty } from '@/lib/field-rules'

// ---- Trigger group → visual color ----
type TriggerGroup = 'lifecycle' | 'reactive' | 'external'

const TRIGGER_GROUP: Record<NodeTriggerType, TriggerGroup> = {
  onMount: 'lifecycle',
  onRowCreate: 'lifecycle',
  onRowCopy: 'lifecycle',
  onRowFocus: 'lifecycle',
  onFieldChange: 'reactive',
  onConditionMet: 'reactive',
  onUserContext: 'external',
  onExternalBinding: 'external',
  onDependencyResolve: 'external',
}

const TRIGGER_ICON_CLASS: Record<TriggerGroup, string> = {
  lifecycle: 'bg-primary/10 text-primary',
  reactive: 'bg-yellow-500/10 text-yellow-400',
  external: 'bg-muted text-muted-foreground',
}

const TRIGGER_BADGE_CLASS: Record<TriggerGroup, string> = {
  lifecycle: 'bg-primary/10 border-primary/20 text-primary',
  reactive: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
  external: '', // intentional: falls back to default badge variant styling
}

const TRIGGER_LABELS: Record<NodeTriggerType, string> = {
  onMount: 'On Load',
  onRowCreate: 'On Create',
  onRowCopy: 'On Copy',
  onRowFocus: 'On Focus',
  onFieldChange: 'Field Change',
  onConditionMet: 'Condition',
  onUserContext: 'User Context',
  onExternalBinding: 'External',
  onDependencyResolve: 'Dependency',
}

// ---- Property → badge color ----
const PROPERTY_BADGE_CLASS: Partial<Record<RuleProperty, string>> = {
  visibility: 'bg-green-500/10 border-green-500/25 text-green-400',
  required: 'bg-red-500/10 border-red-500/25 text-red-400',
  disabled: 'bg-orange-500/10 border-orange-500/25 text-orange-400',
}

const PROPERTY_LABELS: Record<RuleProperty, string> = {
  visibility: 'Show/Hide',
  required: 'Required',
  disabled: 'Disabled',
  label: 'Label',
  options: 'Options',
  value: 'Value',
}

interface FieldRuleCardProps {
  rule: FieldRule
  gridId: string
  fieldId: string
  availableFields: AvailableField[]
  currentTracker?: TrackerDisplayProps
  trackerSchemaId?: string | null
  onChange: (rule: FieldRule) => void
  onRemove: () => void
}

export function FieldRuleV2Card({
  rule,
  gridId,
  fieldId,
  availableFields,
  currentTracker,
  trackerSchemaId,
  onChange,
  onRemove,
}: FieldRuleCardProps) {
  const [expanded, setExpanded] = useState(false)

  const group = TRIGGER_GROUP[rule.trigger] ?? 'external'

  const icon = (
    <div
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded-[4px] shrink-0',
        TRIGGER_ICON_CLASS[group]
      )}
    >
      <Zap className="h-3 w-3" />
    </div>
  )

  const badges = (
    <>
      <Badge
        variant="outline"
        className={cn('text-[10px] h-4 px-1.5 shrink-0 font-mono', TRIGGER_BADGE_CLASS[group])}
      >
        {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
      </Badge>
      <span className="text-[11px] text-muted-foreground">→</span>
      <Badge
        variant="outline"
        className={cn('text-[10px] h-4 px-1.5 shrink-0', PROPERTY_BADGE_CLASS[rule.property])}
      >
        {PROPERTY_LABELS[rule.property] ?? rule.property}
      </Badge>
      {rule.label && (
        <span className="text-[11px] text-muted-foreground truncate">{rule.label}</span>
      )}
    </>
  )

  const actions = (
    <>
      <Checkbox
        checked={rule.enabled}
        onCheckedChange={(checked) => onChange({ ...rule, enabled: checked === true })}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </>
  )

  return (
    <div className={cn(!rule.enabled && 'opacity-50')}>
      <RuleCardShell
        icon={icon}
        badges={badges}
        actions={actions}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      >
        <FieldRuleV2Editor
          rule={rule}
          gridId={gridId}
          fieldId={fieldId}
          availableFields={availableFields}
          currentTracker={currentTracker}
          trackerSchemaId={trackerSchemaId}
          onChange={onChange}
        />
      </RuleCardShell>
    </div>
  )
}
