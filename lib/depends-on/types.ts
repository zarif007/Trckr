/**
 * Types for the depends-on rule engine: rule shape, overrides, and index.
 */

import type { FieldPath } from '@/lib/types/tracker-bindings'

export type DependsOnOperator =
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

export type DependsOnAction = 'isHidden' | 'isRequired' | 'isDisabled'

export type DependsOnRule = {
  source: FieldPath
  operator?: DependsOnOperator
  value?: unknown
  action: DependsOnAction
  /** For isHidden/isRequired/isDisabled: value to set (default true). */
  set?: boolean | unknown
  targets: FieldPath[]
  priority?: number
}

export type DependsOnRules = DependsOnRule[]

/** Pre-parsed path for hot-path use (no parsePath in loops). Must match resolve-bindings.ParsedPath shape for type predicates. */
export type ParsedPath = { tabId: null; gridId: string; fieldId: string }

/** Rule with optional pre-parsed and pre-compiled data (set by buildDependsOnIndex). */
export type EnrichedDependsOnRule = DependsOnRule & {
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

/** Index for O(1) lookup by source, target, or grid. All maps reference EnrichedDependsOnRule. */
export interface DependsOnIndex {
  rulesBySource: Map<string, EnrichedDependsOnRule[]>
  rulesByTarget: Map<string, EnrichedDependsOnRule[]>
  rulesByGridId: Map<string, EnrichedDependsOnRule[]>
}

export interface ResolveDependsOnOptions {
  /** When true, for source fields in the same grid use only rowDataOverride (e.g. Add form / new row). Never use gridData for same-grid source. */
  onlyUseRowDataForSource?: boolean
}
