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

export type DependsOnAction = 'isHidden' | 'isRequired' | 'isDisabled'

export type DependsOnRule = {
  source: FieldPath
  operator?: DependsOnOperator
  value?: unknown
  action: DependsOnAction
  set?: boolean
  targets: FieldPath[]
  priority?: number
}

export type DependsOnRules = DependsOnRule[]

export type FieldOverride = {
  isHidden?: boolean
  isRequired?: boolean
  isDisabled?: boolean
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

export function filterDependsOnRulesForGrid(rules: DependsOnRule[] | undefined, gridId: string): DependsOnRule[] {
  if (!rules || rules.length === 0) return []
  const prefix = `${gridId}.`
  return rules.filter((rule) =>
    Array.isArray(rule.targets) && rule.targets.some((target) => target.startsWith(prefix))
  )
}

export function applyFieldOverrides<T extends Record<string, unknown>>(
  base: T | null | undefined,
  override?: FieldOverride
): T {
  const next = { ...(base ?? {}) } as T
  if (!override) return next
  if (override.isHidden !== undefined) (next as T & FieldOverride).isHidden = override.isHidden
  if (override.isRequired !== undefined) (next as T & FieldOverride).isRequired = override.isRequired
  if (override.isDisabled !== undefined) (next as T & FieldOverride).isDisabled = override.isDisabled
  return next
}

export function resolveDependsOnOverrides(
  rules: DependsOnRule[] | undefined,
  gridData: Record<string, Array<Record<string, unknown>>>,
  targetGridId: string,
  rowIndex: number,
  rowDataOverride?: Record<string, unknown>,
): Record<string, FieldOverride> {
  if (!rules || rules.length === 0) return {}

  const decisions: Record<string, Record<keyof FieldOverride, { priority: number; order: number; value: boolean }>> = {}
  const ruleMeta: Record<string, Record<keyof FieldOverride, { hasShowRule: boolean }>> = {}

  rules.forEach((rule, order) => {
    if (!rule?.source || !rule?.targets || rule.targets.length === 0) return

    const { gridId: sourceGridId, fieldId: sourceFieldId } = parsePath(rule.source as FieldPath)
    if (!sourceGridId || !sourceFieldId) return

    const sourceRowIndex = sourceGridId === targetGridId ? rowIndex : 0
    const sourceValue =
      sourceGridId === targetGridId && rowDataOverride && sourceFieldId in rowDataOverride
        ? rowDataOverride[sourceFieldId]
        : getValueByPath(gridData, rule.source as FieldPath, sourceRowIndex)

    const matches = compareValues(sourceValue, rule.operator ?? 'eq', rule.value)

    const setValue = rule.set ?? true
    const priority = typeof rule.priority === 'number' ? rule.priority : 0

    for (const targetPath of rule.targets) {
      const { gridId: targetId, fieldId: targetFieldId } = parsePath(targetPath)
      if (!targetId || !targetFieldId) continue
      if (targetId !== targetGridId) continue

      const action = normalizeAction(rule.action)
      if (!action) continue

      ruleMeta[targetFieldId] = ruleMeta[targetFieldId] ?? {}
      ruleMeta[targetFieldId][action] = ruleMeta[targetFieldId][action] ?? { hasShowRule: false }
      if (action === 'isHidden' && setValue === false) {
        ruleMeta[targetFieldId][action].hasShowRule = true
      }

      if (!matches) continue

      decisions[targetFieldId] = decisions[targetFieldId] ?? {}
      const existing = decisions[targetFieldId][action]
      if (!existing || priority > existing.priority || (priority === existing.priority && order > existing.order)) {
        decisions[targetFieldId][action] = { priority, order, value: !!setValue }
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
    overrides[fieldId] = {
      isHidden: actions.isHidden?.value,
      isRequired: actions.isRequired?.value,
      isDisabled: actions.isDisabled?.value,
    }
  })

  return overrides
}

function normalizeAction(action: unknown): keyof FieldOverride | null {
  if (!action) return null
  if (action === 'isHidden' || action === 'isRequired' || action === 'isDisabled') {
    return action as keyof FieldOverride
  }
  const normalized = String(action).trim().toLowerCase().replace(/[^a-z]/g, '')
  if (normalized === 'hidden' || normalized === 'ishidden') return 'isHidden'
  if (normalized === 'required' || normalized === 'isrequired') return 'isRequired'
  if (normalized === 'disabled' || normalized === 'isdisabled') return 'isDisabled'
  return null
}
