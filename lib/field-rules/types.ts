/**
 * Types for the field rules engine: rule shape, overrides, and index.
 */

import type { FieldPath } from '@/lib/types/tracker-bindings'

export type FieldRuleOperator =
  | '='
  | '=='
  | '!='
  | '!=='
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'not_empty'

export type FieldRuleAction = 'isHidden' | 'isRequired' | 'isDisabled'

export type FieldRule = {
  source: FieldPath
  operator?: FieldRuleOperator
  value?: unknown
  action: FieldRuleAction
  /** For isHidden/isRequired/isDisabled: value to set (default true). */
  set?: boolean | unknown
  targets: FieldPath[]
  priority?: number
}

export type FieldRules = FieldRule[]

/** Rule shape when stored per target (target is the key; no targets array). */
export type FieldRuleForTarget = Omit<FieldRule, 'targets'>

/** Pre-parsed path for hot-path use (no parsePath in loops). Must match resolve-bindings.ParsedPath shape for type predicates. */
export type ParsedPath = { tabId: null; gridId: string; fieldId: string }

/** Rule with optional pre-parsed and pre-compiled data (set by buildFieldRuleIndex). */
export type EnrichedFieldRule = FieldRule & {
  _parsedSource?: ParsedPath
  _parsedTargets?: ParsedPath[]
  _compare?: (sourceValue: unknown) => boolean
}

export type FieldOverride = {
  isHidden?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  value?: unknown
}

/** Index for O(1) lookup by source, target, or grid. All maps reference EnrichedFieldRule. */
export interface FieldRuleIndex {
  rulesBySource: Map<string, EnrichedFieldRule[]>
  rulesByTarget: Map<string, EnrichedFieldRule[]>
  rulesByGridId: Map<string, EnrichedFieldRule[]>
}

export interface ResolveFieldRuleOptions {
  /** When true, for source fields in the same grid use only rowDataOverride (e.g. Add form / new row). Never use gridData for same-grid source. */
  onlyUseRowDataForSource?: boolean
}
