// lib/field-rules/types.ts

import type { ExprNode } from '@/lib/functions/types'

export type RuleProperty =
  | 'visibility'  // true = visible (shown), false = hidden
  | 'label'
  | 'required'
  | 'disabled'
  | 'value'       // routed to valueOverrides

/**
 * Trigger types for field rules.
 * Lifecycle triggers fire at specific row events.
 * onFieldChange fires reactively whenever any field referenced in the
 * rule's condition/outcome changes (auto-detected from the expression AST).
 */
export type NodeTriggerType =
  | 'onMount'
  | 'onRowCreate'
  | 'onRowCopy'
  | 'onRowFocus'
  | 'onFieldChange'

export type EngineType = 'property' | 'value'

export function deriveEngineType(property: RuleProperty): EngineType {
  return property === 'value' ? 'value' : 'property'
}

export interface FieldRule {
  id: string
  enabled: boolean
  trigger: NodeTriggerType
  /**
   * Guard expression — for boolean properties this IS the outcome (field is active when truthy).
   * For label/value properties this is an optional gate before the outcome is applied.
   */
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
  value?: unknown
}

/** Full output of resolveFieldRulesForRow. */
export interface FieldRulesResult {
  overrides: Record<string, FieldRuleOverride>
  valueOverrides: Record<string, unknown>
}
