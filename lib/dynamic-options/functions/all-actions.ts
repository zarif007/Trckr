/**
 * Dynamic options: all actions (e.g. for depends-on rules).
 */

import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'all_actions'

const ACTIONS = ['isHidden', 'isRequired', 'isDisabled'] as const

export function allActions(_context: DynamicOptionsContext): DynamicOption[] {
  return ACTIONS.map((a) => ({
    value: a,
    label: a,
    id: a,
  }))
}
