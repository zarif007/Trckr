/**
 * Dynamic options: rule set values (true / false).
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_rule_set_values'

export function allRuleSetValues(
  _context: DynamicOptionsContext
): DynamicOption[] {
  return [
    { value: 'true', label: 'True', id: 'true' },
    { value: 'false', label: 'False', id: 'false' },
  ]
}
