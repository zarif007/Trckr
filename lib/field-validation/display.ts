/**
 * Validation Display Utilities
 *
 * Centralized logic for determining when to show validation errors and warnings.
 * This module handles the UX decisions around validation visibility:
 *
 * - Empty fields with "required" errors: Hidden until user interaction
 * - Non-empty fields with validation errors: Shown immediately (including on page load)
 * - Calculated fields: Treated as "interacted" when their value changes via calculations
 *
 * @module field-validation/display
 */

import type { ValidationResult } from "./index";

// ============================================================================
// Types
// ============================================================================

/** Options for determining validation display state */
export interface ValidationDisplayOptions {
  /** The validation result from validateField() */
  result: ValidationResult;
  /** The current field value */
  value: unknown;
  /** Whether the user has interacted with this field (edited, touched, or calculated) */
  hasInteracted: boolean;
}

/** The computed display state for a field's validation */
export interface ValidationDisplayState {
  /** Whether to show the error state (red border, error message) */
  showError: boolean;
  /** Whether to show the warning state (amber border, warning message) */
  showWarning: boolean;
  /** The message to display (error takes precedence over warning) */
  message: string | null;
}

// ============================================================================
// Core Utilities
// ============================================================================

/**
 * Check if a value is considered "empty" for validation purposes.
 *
 * Empty values are:
 * - undefined
 * - null
 * - empty string ""
 * - empty array []
 *
 * This is used to determine whether to show "required" validation errors.
 * Required errors on empty fields are hidden until user interaction.
 *
 * @param value - The value to check
 * @returns true if the value is empty
 *
 * @example
 * ```ts
 * isEmptyValue(undefined)  // true
 * isEmptyValue(null)       // true
 * isEmptyValue("")         // true
 * isEmptyValue([])         // true
 * isEmptyValue(0)          // false (0 is a valid value)
 * isEmptyValue("hello")    // false
 * isEmptyValue([1, 2])     // false
 * ```
 */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Determine whether to show validation errors/warnings for a field.
 *
 * This implements the UX logic for validation visibility:
 *
 * 1. **Empty fields with required errors**: Hidden until user interacts
 *    - Prevents showing "Required" errors on initial page load
 *    - Errors appear after user touches the field or tries to submit
 *
 * 2. **Non-empty fields with errors**: Shown immediately
 *    - If existing data violates constraints, show errors on load
 *    - Calculated fields that exceed limits show errors right away
 *
 * 3. **Warnings**: Follow the same rules as errors
 *    - Warnings on non-empty values show immediately
 *    - Warnings on empty values wait for interaction
 *
 * @param options - The validation result, value, and interaction state
 * @returns The display state (showError, showWarning, message)
 *
 * @example
 * ```ts
 * // Empty required field, not touched - hide error
 * getValidationDisplayState({
 *   result: { hasError: true, error: "Required", ... },
 *   value: "",
 *   hasInteracted: false,
 * });
 * // { showError: false, showWarning: false, message: null }
 *
 * // Non-empty field with constraint violation - show error
 * getValidationDisplayState({
 *   result: { hasError: true, error: "Must be ≤ 10", ... },
 *   value: 15,
 *   hasInteracted: false,
 * });
 * // { showError: true, showWarning: false, message: "Must be ≤ 10" }
 *
 * // Empty field after user interaction - show required error
 * getValidationDisplayState({
 *   result: { hasError: true, error: "Required", ... },
 *   value: "",
 *   hasInteracted: true,
 * });
 * // { showError: true, showWarning: false, message: "Required" }
 * ```
 */
export function getValidationDisplayState({
  result,
  value,
  hasInteracted,
}: ValidationDisplayOptions): ValidationDisplayState {
  const valueIsEmpty = isEmptyValue(value);

  // Show validation if:
  // 1. User has interacted with the field (typed, touched, or value was calculated)
  // 2. OR the value is non-empty (existing invalid data should show errors)
  const shouldShow = hasInteracted || !valueIsEmpty;

  const showError = result.hasError && shouldShow;
  const showWarning = result.hasWarning && !result.hasError && shouldShow;

  let message: string | null = null;
  if (showError) {
    message = result.error;
  } else if (showWarning) {
    message = result.warning;
  }

  return { showError, showWarning, message };
}

// ============================================================================
// Interaction Tracking Utilities
// ============================================================================

/**
 * Create a new Set with additional field IDs marked as interacted.
 *
 * Use this when a field is directly edited or when calculations update fields.
 * Calculated fields should be marked as interacted so their validation shows.
 *
 * @param current - The current Set of interacted field IDs
 * @param fieldIds - Field IDs to add
 * @returns A new Set with the added field IDs
 *
 * @example
 * ```ts
 * const touched = new Set(['name']);
 * const updated = addInteractedFields(touched, ['name', 'total', 'tax']);
 * // updated = Set { 'name', 'total', 'tax' }
 * ```
 */
export function addInteractedFields(
  current: Set<string>,
  fieldIds: string[],
): Set<string> {
  if (fieldIds.length === 0) return current;
  const next = new Set(current);
  for (const id of fieldIds) {
    next.add(id);
  }
  return next;
}

/**
 * Merge directly changed fields with calculated fields into a single interaction set.
 *
 * This is the primary utility for updating interaction state after a field change.
 * It handles both the directly edited field and any fields updated by calculations.
 *
 * @param current - The current Set of interacted field IDs
 * @param changedFieldId - The field that was directly changed
 * @param calculatedFieldIds - Field IDs that were updated by calculations
 * @returns A new Set with all affected field IDs
 *
 * @example
 * ```ts
 * // User edits 'price', calculations update 'subtotal' and 'total'
 * const touched = new Set(['name']);
 * const updated = markFieldsAsInteracted(
 *   touched,
 *   'price',
 *   ['subtotal', 'total']
 * );
 * // updated = Set { 'name', 'price', 'subtotal', 'total' }
 * ```
 */
export function markFieldsAsInteracted(
  current: Set<string>,
  changedFieldId: string,
  calculatedFieldIds: string[] = [],
): Set<string> {
  const next = new Set(current);
  next.add(changedFieldId);
  for (const id of calculatedFieldIds) {
    next.add(id);
  }
  return next;
}

// ============================================================================
// Validation Summary Utilities
// ============================================================================

/** Summary of validation state across multiple fields */
export interface ValidationSummary {
  /** Total number of fields with errors */
  errorCount: number;
  /** Total number of fields with warnings (no errors) */
  warningCount: number;
  /** True if any field has an error */
  hasErrors: boolean;
  /** True if any field has a warning */
  hasWarnings: boolean;
  /** True if form can be submitted (no errors) */
  canSubmit: boolean;
}

/**
 * Compute a summary of validation state across multiple fields.
 *
 * Use this for form-level validation status (e.g., disabling submit button).
 *
 * @param results - Array of validation results for each field
 * @returns Summary with counts and submission eligibility
 *
 * @example
 * ```ts
 * const results = fields.map(f => validateField({ ... }));
 * const summary = computeValidationSummary(results);
 * if (!summary.canSubmit) {
 *   // Disable submit button
 * }
 * ```
 */
export function computeValidationSummary(
  results: ValidationResult[],
): ValidationSummary {
  let errorCount = 0;
  let warningCount = 0;

  for (const result of results) {
    if (result.hasError) {
      errorCount++;
    } else if (result.hasWarning) {
      warningCount++;
    }
  }

  return {
    errorCount,
    warningCount,
    hasErrors: errorCount > 0,
    hasWarnings: warningCount > 0,
    canSubmit: errorCount === 0,
  };
}
