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
import { deriveEngineType, type RuleProperty, type EngineType } from '@/lib/field-rules'

interface PropertyOption {
 value: RuleProperty
 label: string
 description: string
}

const STATE_PROPERTIES: PropertyOption[] = [
 { value: 'visibility', label: 'Show / Hide', description: 'Controls field visibility' },
 { value: 'required', label: 'Required', description: 'Marks field as required' },
 { value: 'disabled', label: 'Disabled', description: 'Makes field read-only' },
]

const CONTENT_PROPERTIES: PropertyOption[] = [
 { value: 'label', label: 'Label text', description: 'Overrides the field label' },
 { value: 'value', label: 'Value', description: 'Sets the field value programmatically' },
]

interface PropertySelectorProps {
 value: RuleProperty
 onChange: (property: RuleProperty, engineType: EngineType) => void
 disabled?: boolean
}

export function PropertySelector({ value, onChange, disabled }: PropertySelectorProps) {
 return (
 <Select
 value={value}
 onValueChange={(v) => {
 const prop = v as RuleProperty
 onChange(prop, deriveEngineType(prop))
 }}
 disabled={disabled}
 >
 <SelectTrigger className="h-8 text-xs">
 <SelectValue placeholder="Select property…" />
 </SelectTrigger>
 <SelectContent>
 <SelectGroup>
 <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">State</SelectLabel>
 {STATE_PROPERTIES.map((p) => (
 <SelectItem key={p.value} value={p.value} className="text-xs">
 <span className="font-medium">{p.label}</span>
 <span className="ml-2 text-muted-foreground text-[11px]">{p.description}</span>
 </SelectItem>
 ))}
 </SelectGroup>
 <SelectGroup>
 <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Content</SelectLabel>
 {CONTENT_PROPERTIES.map((p) => (
 <SelectItem key={p.value} value={p.value} className="text-xs">
 <span className="font-medium">{p.label}</span>
 <span className="ml-2 text-muted-foreground text-[11px]">{p.description}</span>
 </SelectItem>
 ))}
 </SelectGroup>
 </SelectContent>
 </Select>
 )
}
