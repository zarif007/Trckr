/**
 * Validation and auto-fix for tracker schema integrity.
 * Ensures layoutNodes reference existing grids/fields and options/multiselect fields have an option source.
 */

import type { TrackerLike, ValidationResult } from './types'
import { buildValidationContext } from './context'
import {
  validateLayout,
  validateOptionsFields,
  validateDependsOn,
  validateBindings,
  validateValidations,
} from './validators'

export type { TrackerLike, ValidationResult, BindingEntry } from './types'
export { autoFixBindings } from './auto-fix'
export { validateBindings, validateDependsOn, validateValidations } from './validators'

function mergeResults(
  results: Array<{ errors?: string[]; warnings?: string[] }>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  for (const r of results) {
    if (r.errors) errors.push(...r.errors)
    if (r.warnings) warnings.push(...r.warnings)
  }
  return { errors, warnings }
}

export function validateTracker(tracker: TrackerLike | null | undefined): ValidationResult {
  if (!tracker) {
    return { valid: true, errors: [], warnings: [] }
  }

  const ctx = buildValidationContext(tracker)
  const results = [
    validateLayout(ctx),
    validateOptionsFields(ctx),
    validateDependsOn(tracker, ctx),
    validateBindings(ctx),
    validateValidations(ctx),
  ]

  const { errors, warnings } = mergeResults(results)
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
