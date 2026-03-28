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
import { Badge } from '@/components/ui/badge'
import { deriveEngineType, type RuleProperty, type EngineType } from '@/lib/field-rules-v2/types'

interface PropertyOption {
  value: RuleProperty
  label: string
  description: string
}

const UI_PROPERTIES: PropertyOption[] = [
  { value: 'visibility', label: 'Show / Hide', description: 'Controls field visibility' },
  { value: 'required', label: 'Required', description: 'Marks field as required' },
  { value: 'disabled', label: 'Disabled', description: 'Makes field read-only' },
  { value: 'label', label: 'Label text', description: 'Overrides the field label' },
  { value: 'options', label: 'Options', description: 'Replaces select/multiselect options' },
]

const DATA_PROPERTIES: PropertyOption[] = [
  { value: 'value', label: 'Value', description: 'Sets the field value programmatically' },
]

interface PropertySelectorProps {
  value: RuleProperty
  onChange: (property: RuleProperty, engineType: EngineType) => void
  disabled?: boolean
}

export function PropertySelector({ value, onChange, disabled }: PropertySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(v) => {
          const prop = v as RuleProperty
          onChange(prop, deriveEngineType(prop))
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs flex-1">
          <SelectValue placeholder="Select property…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">UI State</SelectLabel>
            {UI_PROPERTIES.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                <span className="font-medium">{p.label}</span>
                <span className="ml-2 text-muted-foreground text-[11px]">{p.description}</span>
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Data</SelectLabel>
            {DATA_PROPERTIES.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                <span className="font-medium">{p.label}</span>
                <span className="ml-2 text-muted-foreground text-[11px]">{p.description}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Badge variant="outline" className="shrink-0 text-[10px] h-5 px-1.5 font-mono border-border/60">
        {deriveEngineType(value) === 'property' ? 'UI' : 'Data'}
      </Badge>
    </div>
  )
}
