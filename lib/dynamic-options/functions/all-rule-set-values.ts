/**
 * Dynamic options: rule set values (true / false).
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_rule_set_values'

export const FIELD_RULES_SET_OPTIONS: Array<{ value: string; label: string }> = [
 { value: 'true', label: 'True' },
 { value: 'false', label: 'False' },
]

export function allRuleSetValues(
 context: DynamicOptionsContext
): DynamicOption[] {
 void context
 return FIELD_RULES_SET_OPTIONS.map((o) => ({ ...o, id: o.value }))
}
