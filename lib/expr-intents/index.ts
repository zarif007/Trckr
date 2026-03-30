/**
 * Shared logic for resolving `_intent` placeholders in tracker validations and calculations
 * into expression ASTs (same pipeline as /api/agent/generate-expr).
 *
 * Resolution runs on the client after generate-tracker streaming completes so the HTTP response
 * can stay a single streamed object. Moving resolution into the generate-tracker handler would
 * require buffering the full object before sending (worse time-to-first-byte) or an extra round-trip.
 */

export type { ExprIntent, ExprIntentPurpose, ExprIntentResolution } from './types'
export { parseFieldPath } from './field-path'
export {
  collectExprIntents,
  isIntentCalculation,
  isIntentValidationRule,
} from './collect'
export { applyExprIntentResults } from './apply'
export {
  exprIntentToolInputSchema,
  generateCalculationExpressionTool,
  generateValidationExpressionTool,
  type ExprIntentToolInput,
} from './tools'
