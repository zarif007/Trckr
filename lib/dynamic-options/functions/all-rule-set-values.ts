/**
 * Dynamic options: rule set values (true / false).
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_rule_set_values'

export const DEPENDS_ON_SET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
]

export function allRuleSetValues(
  _context: DynamicOptionsContext
): DynamicOption[] {
  return DEPENDS_ON_SET_OPTIONS.map((o) => ({ ...o, id: o.value }))
}
