// lib/field-rules-v2/types.ts

import type { ExprNode } from '@/lib/functions/types'

export type RuleProperty =
  | 'visibility'  // true = visible (shown), false = hidden
  | 'label'       // string label override
  | 'required'    // boolean
  | 'disabled'    // boolean
  | 'options'     // array of { label, value, id? }
  | 'value'       // any value (routed to Value Engine)

export type NodeTriggerType =
  | 'onMount'
  | 'onRowCreate'
  | 'onRowCopy'
  | 'onFieldChange'
  | 'onConditionMet'
  | 'onUserContext'
  | 'onExternalBinding'
  | 'onRowFocus'
  | 'onDependencyResolve'

export type EngineType = 'property' | 'value'

export function deriveEngineType(property: RuleProperty): EngineType {
  return property === 'value' ? 'value' : 'property'
}

export interface FieldRuleV2 {
  id: string
  enabled: boolean
  trigger: NodeTriggerType
  /** For onFieldChange: which field to watch. For onConditionMet: the condition expr. */
  triggerConfig?: {
    watchedFieldId?: string    // onFieldChange
    contextVar?: 'user' | 'role' | 'team' | 'timezone'  // onUserContext
    sourceSchemaId?: string    // onExternalBinding
    fieldPath?: string         // onExternalBinding
    refreshIntervalMs?: number // onExternalBinding
    linkedFieldId?: string     // onDependencyResolve
    recordPath?: string        // onDependencyResolve
    condition?: ExprNode       // onConditionMet
  }
  /** Guard expression — if present, rule only fires when this evaluates truthy. */
  condition?: ExprNode
  property: RuleProperty
  outcome: ExprNode
  engineType: EngineType
  label?: string
}

/** Top-level map stored in schema: keyed by "gridId.fieldId" (target field). */
export type FieldRulesV2Map = Record<string, FieldRuleV2[]>

/** Overrides produced by the Property Engine for one field. */
export interface FieldRulesV2PropertyOverride {
  visibility?: boolean
  label?: string
  required?: boolean
  disabled?: boolean
  options?: Array<{ label: string; value: unknown; id?: string }>
}

/** Full output of V2 resolution for a grid row (keyed by fieldId). */
export interface FieldRulesV2Overrides {
  propertyOverrides: Record<string, FieldRulesV2PropertyOverride>
  valueOverrides: Record<string, unknown>
}

/** Triggers that can be evaluated synchronously at render time. */
export const SYNC_TRIGGER_TYPES: NodeTriggerType[] = [
  'onMount',
  'onRowCreate',
  'onRowCopy',
  'onFieldChange',
  'onConditionMet',
  'onUserContext',
  'onRowFocus',
]

/** Triggers that require async resolution (not yet implemented; stubbed). */
export const ASYNC_TRIGGER_TYPES: NodeTriggerType[] = [
  'onExternalBinding',
  'onDependencyResolve',
]
