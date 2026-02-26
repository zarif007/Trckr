/**
 * Dynamic options for dynamic_select and dynamic_multiselect fields.
 * Options are resolved by function id via a registry; add new functions in functions/ and register them.
 */

import { registerBuiltInDynamicOptions } from './functions'

// Register built-in functions so getDynamicOptions works out of the box
registerBuiltInDynamicOptions()

export * from './types'
export { graphToPipelineAst, pipelineAstToGraph } from './pipeline-ast'
export {
  getDynamicOptions,
  registerDynamicOptionsFunction,
  getRegisteredDynamicOptionsIds,
} from './registry'
export {
  resolveDynamicOptions,
  resolveDynamicOptionsSync,
  executeDynamicOptionFunction,
  clearDynamicOptionsCache,
  dynamicOptionFunctionSchema,
  dynamicOptionFunctionDslSchema,
  dynamicOptionFunctionGraphSchema,
  dynamicConnectorSchema,
  dynamicOptionsDefinitionsSchema,
  dynamicValueSelectorSchema,
  dynamicOptionTransformSchema,
  dynamicOptionSourceSchema,
  dynamicOptionOutputMappingSchema,
  dynamicFunctionGraphSchema,
  dynamicFunctionGraphNodeSchema,
  dynamicFunctionGraphEdgeSchema,
  compileDynamicOptionFunctionGraph,
  generateDynamicOptionFunctionOutputSchema,
} from './user-functions'
