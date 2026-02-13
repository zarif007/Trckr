import type { FieldPath } from './types/tracker-bindings'
import { getValueByPath, parsePath } from './resolve-bindings'

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

export type DependsOnAction = 'isHidden' | 'isRequired' | 'isDisabled' | 'set'

export type DependsOnRule = {
  source: FieldPath
  operator?: DependsOnOperator
  value?: unknown
  action: DependsOnAction
  /** For isHidden/isRequired/isDisabled: value to set (default true). For action 'set': value to write to target fields. */
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
  /** When action is 'set': value to apply to the target field (display and/or write to grid). */
  value?: unknown
}

/** Index for O(1) lookup by source, target, or grid. All maps reference EnrichedDependsOnRule. */
export interface DependsOnIndex {
  rulesBySource: Map<string, EnrichedDependsOnRule[]>
  rulesByTarget: Map<string, EnrichedDependsOnRule[]>
  rulesByGridId: Map<string, EnrichedDependsOnRule[]>
}

const numericOperators = new Set(['>', '>=', '<', '<=', 'gt', 'gte', 'lt', 'lte'])

function normalizeOperator(op?: DependsOnOperator): DependsOnOperator {
  if (!op) return 'eq'
  if (op === '==') return 'eq'
  if (op === '=') return 'eq'
  if (op === '!=') return 'neq'
  if (op === '!==') return 'neq'
  return op
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function compareValues(sourceValue: unknown, operator: DependsOnOperator, expected: unknown): boolean {
  const op = normalizeOperator(operator)

  if (op === 'is_empty') return isEmptyValue(sourceValue)
  if (op === 'not_empty') return !isEmptyValue(sourceValue)

  if (op === 'contains' || op === 'not_contains') {
    const contains = Array.isArray(sourceValue)
      ? sourceValue.includes(expected as never)
      : typeof sourceValue === 'string'
        ? sourceValue.includes(String(expected ?? ''))
        : false
    return op === 'contains' ? contains : !contains
  }

  if (op === 'starts_with' || op === 'ends_with') {
    const source = typeof sourceValue === 'string' ? sourceValue : String(sourceValue ?? '')
    const val = String(expected ?? '')
    return op === 'starts_with' ? source.startsWith(val) : source.endsWith(val)
  }

  if (op === 'in' || op === 'not_in') {
    const list = Array.isArray(expected) ? expected : [expected]
    const contains = list.some((item) => item === sourceValue || String(item) === String(sourceValue ?? ''))
    return op === 'in' ? contains : !contains
  }

  if (numericOperators.has(op)) {
    const left = toNumber(sourceValue)
    const right = toNumber(expected)
    if (left === null || right === null) return false
    switch (op) {
      case '>':
      case 'gt':
        return left > right
      case '>=':
      case 'gte':
        return left >= right
      case '<':
      case 'lt':
        return left < right
      case '<=':
      case 'lte':
        return left <= right
      default:
        return false
    }
  }

  if (op === 'neq') {
    return sourceValue !== expected && String(sourceValue ?? '') !== String(expected ?? '')
  }

  // Default: eq
  return sourceValue === expected || String(sourceValue ?? '') === String(expected ?? '')
}

/** Pre-compile operator + value into a comparison function (used at index build time). */
function compileCompare(operator?: DependsOnOperator, expected?: unknown): (sourceValue: unknown) => boolean {
  const op = normalizeOperator(operator)
  return (sourceValue: unknown) => compareValues(sourceValue, op, expected)
}

/** Build index: rulesBySource, rulesByTarget, rulesByGridId; enrich rules with _parsedSource, _parsedTargets, _compare. */
export function buildDependsOnIndex(rules: DependsOnRules | undefined): DependsOnIndex {
  const rulesBySource = new Map<string, EnrichedDependsOnRule[]>()
  const rulesByTarget = new Map<string, EnrichedDependsOnRule[]>()
  const rulesByGridId = new Map<string, EnrichedDependsOnRule[]>()

  if (!rules || rules.length === 0) {
    return { rulesBySource, rulesByTarget, rulesByGridId }
  }

  for (const rule of rules) {
    if (!rule?.source || !Array.isArray(rule.targets) || rule.targets.length === 0) continue

    const parsedSource = parsePath(rule.source as FieldPath)
    const sourceGridId = parsedSource.gridId
    const sourceFieldId = parsedSource.fieldId
    if (!sourceGridId || !sourceFieldId) continue

    const parsedTargets: ParsedPath[] = []
    for (const target of rule.targets) {
      const p = parsePath(target)
      if (p.gridId && p.fieldId) parsedTargets.push({ tabId: null, gridId: p.gridId, fieldId: p.fieldId })
    }
    if (parsedTargets.length === 0) continue

    const enriched: EnrichedDependsOnRule = {
      ...rule,
      _parsedSource: { tabId: null, gridId: sourceGridId, fieldId: sourceFieldId },
      _parsedTargets: parsedTargets,
      _compare: compileCompare(rule.operator, rule.value),
    }

    const listS = rulesBySource.get(rule.source) ?? []
    listS.push(enriched)
    rulesBySource.set(rule.source, listS)

    for (const target of rule.targets) {
      const listT = rulesByTarget.get(target) ?? []
      listT.push(enriched)
      rulesByTarget.set(target, listT)
    }
    for (const { gridId } of parsedTargets) {
      const listG = rulesByGridId.get(gridId) ?? []
      if (!listG.includes(enriched)) listG.push(enriched)
      rulesByGridId.set(gridId, listG)
    }
  }

  return { rulesBySource, rulesByTarget, rulesByGridId }
}

/** O(1) get rules that target the given grid. */
export function getRulesForGrid(index: DependsOnIndex, gridId: string): EnrichedDependsOnRule[] {
  return index.rulesByGridId.get(gridId) ?? []
}

/** O(1) get rules that depend on the given source path (for invalidation). */
export function getRulesForSource(index: DependsOnIndex, sourcePath: string): EnrichedDependsOnRule[] {
  return index.rulesBySource.get(sourcePath) ?? []
}

export function filterDependsOnRulesForGrid(rules: DependsOnRule[] | undefined, gridId: string): DependsOnRule[] {
  if (!rules || rules.length === 0) return []
  const index = buildDependsOnIndex(rules)
  return getRulesForGrid(index, gridId)
}

/** Applies dependsOn overrides over base config. Override values take priority when defined. */
export function applyFieldOverrides<T extends Record<string, unknown>>(
  base: T | null | undefined,
  override?: FieldOverride
): T {
  const b = (base ?? {}) as T & FieldOverride
  const o = override
  const next = { ...b } as T & FieldOverride
  if (!o) return next as T
  next.isHidden = o.isHidden !== undefined ? o.isHidden : b.isHidden
  next.isRequired = o.isRequired !== undefined ? o.isRequired : b.isRequired
  next.isDisabled = o.isDisabled !== undefined ? o.isDisabled : b.isDisabled
  if (o.value !== undefined) next.value = o.value
  return next as T
}

export interface ResolveDependsOnOptions {
  /** When true, for source fields in the same grid use only rowDataOverride (e.g. Add form / new row). Never use gridData for same-grid source. */
  onlyUseRowDataForSource?: boolean
}

export function resolveDependsOnOverrides(
  rules: DependsOnRule[] | undefined,
  gridData: Record<string, Array<Record<string, unknown>>>,
  targetGridId: string,
  rowIndex: number,
  rowDataOverride?: Record<string, unknown>,
  options?: ResolveDependsOnOptions,
): Record<string, FieldOverride> {
  if (!rules || rules.length === 0) return {}

  const onlyUseRowDataForSource = options?.onlyUseRowDataForSource === true

  type DecisionValue = { priority: number; order: number; value: boolean | unknown }
  const decisions: Record<string, Partial<Record<keyof FieldOverride | 'setValue', DecisionValue>>> = {}
  const ruleMeta: Record<string, Record<keyof FieldOverride, { hasShowRule: boolean }>> = {}

  rules.forEach((rule, order) => {
    if (!rule?.source || !rule?.targets || rule.targets.length === 0) return

    const enriched = rule as EnrichedDependsOnRule
    const sourceGridId = enriched._parsedSource?.gridId ?? parsePath(rule.source as FieldPath).gridId
    const sourceFieldId = enriched._parsedSource?.fieldId ?? parsePath(rule.source as FieldPath).fieldId
    if (!sourceGridId || !sourceFieldId) return

    const sourceRowIndex = sourceGridId === targetGridId ? rowIndex : 0
    const useRowDataOnly =
      sourceGridId === targetGridId &&
      (onlyUseRowDataForSource || (rowDataOverride && sourceFieldId in rowDataOverride))
    const sourceValue = useRowDataOnly
      ? rowDataOverride?.[sourceFieldId]
      : getValueByPath(gridData, rule.source as FieldPath, sourceRowIndex)

    const matches = enriched._compare ? enriched._compare(sourceValue) : compareValues(sourceValue, rule.operator ?? 'eq', rule.value)

    const setValue = rule.set ?? true
    const priority = typeof rule.priority === 'number' ? rule.priority : 0

    const targetsToIterate = enriched._parsedTargets ?? rule.targets.map((t) => parsePath(t)).filter((p): p is ParsedPath => !!p.gridId && !!p.fieldId)
    for (const target of targetsToIterate) {
      const targetId = 'gridId' in target ? target.gridId : parsePath(target as FieldPath).gridId
      const targetFieldId = 'fieldId' in target ? target.fieldId : parsePath(target as FieldPath).fieldId
      if (!targetId || !targetFieldId) continue
      if (targetId !== targetGridId) continue

      const action = normalizeAction(rule.action)
      if (!action) continue

      if (action !== 'setValue') {
        ruleMeta[targetFieldId] = ruleMeta[targetFieldId] ?? {}
        ruleMeta[targetFieldId][action] = ruleMeta[targetFieldId][action] ?? { hasShowRule: false }
        if (action === 'isHidden' && setValue === false) {
          ruleMeta[targetFieldId][action].hasShowRule = true
        }
      }

      if (!matches) continue

      decisions[targetFieldId] = decisions[targetFieldId] ?? {}
      if (action === 'setValue') {
        const existing = decisions[targetFieldId].setValue
        const valueToSet = rule.set
        if (!existing || priority > existing.priority || (priority === existing.priority && order > existing.order)) {
          decisions[targetFieldId].setValue = { priority, order, value: valueToSet }
        }
      } else {
        const existing = decisions[targetFieldId][action]
        if (!existing || priority > existing.priority || (priority === existing.priority && order > existing.order)) {
          decisions[targetFieldId][action] = { priority, order, value: !!setValue }
        }
      }
    }
  })

  for (const [fieldId, actions] of Object.entries(ruleMeta)) {
    for (const [action, meta] of Object.entries(actions) as Array<[keyof FieldOverride, { hasShowRule: boolean }]>) {
      if (action !== 'isHidden') continue
      if (!meta?.hasShowRule) continue
      const existing = decisions[fieldId]?.[action]
      if (!existing) {
        decisions[fieldId] = decisions[fieldId] ?? {}
        decisions[fieldId][action] = { priority: -Infinity, order: -Infinity, value: true }
      }
    }
  }

  const overrides: Record<string, FieldOverride> = {}
  Object.entries(decisions).forEach(([fieldId, actions]) => {
    const setVal = (actions as { setValue?: DecisionValue }).setValue?.value
    const out: FieldOverride = {
      isHidden: (actions.isHidden?.value as boolean | undefined) ?? undefined,
      isRequired: (actions.isRequired?.value as boolean | undefined) ?? undefined,
      isDisabled: (actions.isDisabled?.value as boolean | undefined) ?? undefined,
    }
    if (setVal !== undefined) out.value = setVal
    overrides[fieldId] = out
  })

  return overrides
}

function normalizeAction(action: unknown): keyof FieldOverride | 'setValue' | null {
  if (!action) return null
  if (action === 'isHidden' || action === 'isRequired' || action === 'isDisabled' || action === 'set') {
    return action === 'set' ? 'setValue' : (action as keyof FieldOverride)
  }
  const normalized = String(action).trim().toLowerCase().replace(/[^a-z]/g, '')
  if (normalized === 'hidden' || normalized === 'ishidden') return 'isHidden'
  if (normalized === 'required' || normalized === 'isrequired') return 'isRequired'
  if (normalized === 'disabled' || normalized === 'isdisabled') return 'isDisabled'
  if (normalized === 'set') return 'setValue'
  return null
}
