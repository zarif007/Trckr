/**
 * Condition evaluation: normalize operator, compare source value to expected value,
 * and compile a comparison function for use in the index.
 */

import type { DependsOnOperator } from './types'

const NUMERIC_OPERATORS = new Set([
  '>', '>=', '<', '<=', 'gt', 'gte', 'lt', 'lte',
])

export function normalizeOperator(op?: DependsOnOperator): DependsOnOperator {
  if (!op) return 'eq'
  if (op === '==') return 'eq'
  if (op === '=') return 'eq'
  if (op === '!=') return 'neq'
  if (op === '!==') return 'neq'
  return op
}

export function isEmptyValue(value: unknown): boolean {
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

/** Evaluate condition: does sourceValue match (operator, expected)? */
export function compareValues(
  sourceValue: unknown,
  operator: DependsOnOperator,
  expected: unknown
): boolean {
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
    const contains = list.some(
      (item) => item === sourceValue || String(item) === String(sourceValue ?? '')
    )
    return op === 'in' ? contains : !contains
  }

  if (NUMERIC_OPERATORS.has(op)) {
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
    return (
      sourceValue !== expected &&
      String(sourceValue ?? '') !== String(expected ?? '')
    )
  }

  return (
    sourceValue === expected ||
    String(sourceValue ?? '') === String(expected ?? '')
  )
}

/** Pre-compile operator + value into a comparison function (used at index build time). */
export function compileCompare(
  operator?: DependsOnOperator,
  expected?: unknown
): (sourceValue: unknown) => boolean {
  const op = normalizeOperator(operator)
  return (sourceValue: unknown) => compareValues(sourceValue, op, expected)
}
