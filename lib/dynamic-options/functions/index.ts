/**
 * Built-in dynamic option functions. Registers them with the registry so they are available by id.
 */

import { registerDynamicOptionsFunction } from '../registry'
import { ID as ALL_FIELD_PATHS_ID, allFieldPaths } from './all-field-paths'
import { ID as ALL_OPERATORS_ID, allOperators } from './all-operators'
import { ID as ALL_ACTIONS_ID, allActions } from './all-actions'
import { ID as ALL_RULE_SET_VALUES_ID, allRuleSetValues } from './all-rule-set-values'

export function registerBuiltInDynamicOptions(): void {
  registerDynamicOptionsFunction(ALL_FIELD_PATHS_ID, allFieldPaths)
  registerDynamicOptionsFunction(ALL_OPERATORS_ID, allOperators)
  registerDynamicOptionsFunction(ALL_ACTIONS_ID, allActions)
  registerDynamicOptionsFunction(ALL_RULE_SET_VALUES_ID, allRuleSetValues)
}
