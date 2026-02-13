/**
 * Dynamic options: all operators (e.g. for depends-on rules).
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_operators'

const OPERATORS = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'in', 'not_in', 'contains', 'not_contains',
  'is_empty', 'not_empty', 'starts_with', 'ends_with',
]

export function allOperators(_context: DynamicOptionsContext): DynamicOption[] {
  return OPERATORS.map((op) => ({
    value: op,
    label: op,
    id: op,
  }))
}
