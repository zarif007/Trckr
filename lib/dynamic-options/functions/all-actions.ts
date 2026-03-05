/**
 * Dynamic options: all actions (e.g. for depends-on rules).
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_actions'

export const DEPENDS_ON_ACTIONS = ['isHidden', 'isRequired', 'isDisabled'] as const

const ACTIONS = DEPENDS_ON_ACTIONS

export function allActions(context: DynamicOptionsContext): DynamicOption[] {
  void context
  return ACTIONS.map((a) => ({
    value: a,
    label: a,
    id: a,
  }))
}
