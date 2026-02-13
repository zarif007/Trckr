/**
 * Dynamic options for dynamic_select and dynamic_multiselect fields.
 * Options are resolved by function id via a registry; add new functions in functions/ and register them.
 */

import { registerBuiltInDynamicOptions } from './functions'

// Register built-in functions so getDynamicOptions works out of the box
registerBuiltInDynamicOptions()

export * from './types'
export {
  getDynamicOptions,
  registerDynamicOptionsFunction,
  getRegisteredDynamicOptionsIds,
} from './registry'
