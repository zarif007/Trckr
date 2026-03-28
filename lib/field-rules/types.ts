// lib/field-rules/types.ts

import type { ExprNode } from '@/lib/functions/types'

export type RuleProperty =
  | 'visibility'  // true = visible (shown), false = hidden
  | 'label'
  | 'required'
  | 'disabled'
  | 'options'
  | 'value'       // routed to valueOverrides

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

export interface FieldRule {
  id: string
  enabled: boolean
  trigger: NodeTriggerType
  /** For onFieldChange: which field to watch. For onConditionMet: the condition expr. */
  triggerConfig?: {
    watchedFieldId?: string
    contextVar?: 'user' | 'role' | 'team' | 'timezone'
    sourceSchemaId?: string
    fieldPath?: string
    refreshIntervalMs?: number
    linkedFieldId?: string
    recordPath?: string
    condition?: ExprNode
  }
  /** Guard expression — rule only fires when this evaluates truthy. */
  condition?: ExprNode
  property: RuleProperty
  outcome: ExprNode
  engineType: EngineType
  label?: string
}

/** Top-level map stored in schema: keyed by "gridId.fieldId" (target field). */
export type FieldRulesMap = Record<string, FieldRule[]>

/**
 * Resolved property overrides for one field.
 * visibility: true = shown, false = hidden (inverted from field config isHidden).
 * value is stored here when grids merge it from valueOverrides for cell consumption.
 */
export interface FieldRuleOverride {
  visibility?: boolean
  required?: boolean
  disabled?: boolean
  label?: string
  options?: Array<{ label: string; value: unknown; id?: string }>
  value?: unknown
}

/** Full output of resolveFieldRulesForRow. */
export interface FieldRulesResult {
  overrides: Record<string, FieldRuleOverride>
  valueOverrides: Record<string, unknown>
}

/** Triggers evaluated synchronously at render time. */
export const SYNC_TRIGGER_TYPES: NodeTriggerType[] = [
  'onMount',
  'onRowCreate',
  'onRowCopy',
  'onFieldChange',
  'onConditionMet',
  'onUserContext',
  'onRowFocus',
]

/** Triggers requiring async resolution (not yet implemented). */
export const ASYNC_TRIGGER_TYPES: NodeTriggerType[] = [
  'onExternalBinding',
  'onDependencyResolve',
]
