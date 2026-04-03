/**
 * Dynamic options: all actions (e.g. for field rules).
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_actions'

export const FIELD_RULES_ACTIONS = ['isHidden', 'isRequired', 'isDisabled'] as const

const ACTIONS = FIELD_RULES_ACTIONS

export function allActions(context: DynamicOptionsContext): DynamicOption[] {
 void context
 return ACTIONS.map((a) => ({
 value: a,
 label: a,
 id: a,
 }))
}
