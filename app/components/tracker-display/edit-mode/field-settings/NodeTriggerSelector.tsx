'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NodeTriggerType } from '@/lib/field-rules'

interface NodeTriggerOption {
  value: NodeTriggerType
  label: string
  description: string
}

const LIFECYCLE_TRIGGERS: NodeTriggerOption[] = [
  { value: 'onMount', label: 'On Load', description: 'Fires when the tracker first loads' },
  { value: 'onRowCreate', label: 'On Row Create', description: 'Fires when a new row is added' },
  { value: 'onRowCopy', label: 'On Row Copy', description: 'Fires when a row is duplicated' },
  { value: 'onRowFocus', label: 'On Row Focus', description: 'Fires when a row enters edit mode' },
]

const REACTIVE_TRIGGERS: NodeTriggerOption[] = [
  { value: 'onFieldChange', label: 'On Field Change', description: 'Fires when a specific field value changes' },
  { value: 'onConditionMet', label: 'On Condition Met', description: 'Fires when a boolean expression becomes true' },
  { value: 'onUserContext', label: 'On User Context', description: 'Fires based on current user, role, or team' },
]

const EXTERNAL_TRIGGERS: NodeTriggerOption[] = [
  { value: 'onExternalBinding', label: 'On External Binding', description: 'Fires when data is pulled from another tracker or API' },
  { value: 'onDependencyResolve', label: 'On Dependency Resolve', description: 'Fires when a linked record field gets a value' },
]

interface NodeTriggerSelectorProps {
  value: NodeTriggerType
  onChange: (value: NodeTriggerType) => void
  disabled?: boolean
}

export function NodeTriggerSelector({ value, onChange, disabled }: NodeTriggerSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange as (v: string) => void} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Select trigger…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Lifecycle</SelectLabel>
          {LIFECYCLE_TRIGGERS.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              <span className="font-medium">{t.label}</span>
              <span className="ml-2 text-muted-foreground text-[11px]">{t.description}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Reactive</SelectLabel>
          {REACTIVE_TRIGGERS.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              <span className="font-medium">{t.label}</span>
              <span className="ml-2 text-muted-foreground text-[11px]">{t.description}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">External</SelectLabel>
          {EXTERNAL_TRIGGERS.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              <span className="font-medium">{t.label}</span>
              <span className="ml-2 text-muted-foreground text-[11px]">{t.description}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
