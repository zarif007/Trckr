"use client";

/**
 * React Hooks for Field Validation
 *
 * Provides reusable hooks for managing validation state in React components.
 * These hooks encapsulate the common patterns used across tracker grids and forms.
 *
 * @module field-validation/hooks
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ValidationResult } from "./index";
import {
  getValidationDisplayState,
  markFieldsAsInteracted,
  type ValidationDisplayState,
} from "./display";

// ============================================================================
// useInteractionTracking
// ============================================================================

/** Return type for useInteractionTracking hook */
export interface InteractionTrackingState {
  /** Set of field IDs that have been interacted with */
  interactedFields: Set<string>;
  /** Check if a specific field has been interacted with */
  hasInteracted: (fieldId: string) => boolean;
  /** Mark a field as interacted (e.g., on blur, change) */
  markAsInteracted: (fieldId: string) => void;
  /** Mark multiple fields as interacted (e.g., after calculations) */
  markFieldsAsInteracted: (
    changedFieldId: string,
    calculatedFieldIds?: string[],
  ) => void;
  /** Reset all interaction tracking (e.g., when form resets) */
  reset: () => void;
}

/**
 * Hook for tracking which fields the user has interacted with.
 *
 * This is used to determine when to show validation errors:
 * - Fields not interacted with: Hide "required" errors on empty values
 * - Fields interacted with: Show all validation errors
 * - Calculated fields: Automatically marked as interacted when updated
 *
 * @returns Interaction tracking state and methods
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const interaction = useInteractionTracking();
 *
 *   const handleFieldChange = (fieldId: string, value: unknown) => {
 *     // After calculations, mark calculated fields as interacted
 *     const calcResult = applyCalculations(value);
 *     interaction.markFieldsAsInteracted(fieldId, calcResult.updatedFieldIds);
 *   };
 *
 *   return fields.map(field => (
 *     <Field
 *       key={field.id}
 *       showValidation={interaction.hasInteracted(field.id) || hasValue}
 *       onBlur={() => interaction.markAsInteracted(field.id)}
 *     />
 *   ));
 * }
 * ```
 */
export function useInteractionTracking(): InteractionTrackingState {
  const [interactedFields, setInteractedFields] = useState<Set<string>>(
    () => new Set(),
  );

  const hasInteracted = useCallback(
    (fieldId: string) => interactedFields.has(fieldId),
    [interactedFields],
  );

  const markAsInteracted = useCallback((fieldId: string) => {
    setInteractedFields((prev) => {
      if (prev.has(fieldId)) return prev;
      const next = new Set(prev);
      next.add(fieldId);
      return next;
    });
  }, []);

  const markFieldsAsInteractedCb = useCallback(
    (changedFieldId: string, calculatedFieldIds: string[] = []) => {
      setInteractedFields((prev) =>
        markFieldsAsInteracted(prev, changedFieldId, calculatedFieldIds),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    setInteractedFields(new Set());
  }, []);

  return {
    interactedFields,
    hasInteracted,
    markAsInteracted,
    markFieldsAsInteracted: markFieldsAsInteractedCb,
    reset,
  };
}

// ============================================================================
// useFieldValidationDisplay
// ============================================================================

/** Input for useFieldValidationDisplay hook */
export interface FieldValidationDisplayInput {
  /** The validation result from validateField() */
  result: ValidationResult;
  /** The current field value */
  value: unknown;
  /** Whether the user has interacted with this field */
  hasInteracted: boolean;
}

/**
 * Hook for computing validation display state for a single field.
 *
 * Memoizes the display state computation to avoid unnecessary re-renders.
 *
 * @param input - Validation result, value, and interaction state
 * @returns Memoized display state
 *
 * @example
 * ```tsx
 * function FieldInput({ field, value, validation, hasInteracted }) {
 *   const display = useFieldValidationDisplay({
 *     result: validation,
 *     value,
 *     hasInteracted,
 *   });
 *
 *   return (
 *     <div className={display.showError ? 'border-red-500' : ''}>
 *       <input value={value} />
 *       {display.message && <span>{display.message}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFieldValidationDisplay({
  result,
  value,
  hasInteracted,
}: FieldValidationDisplayInput): ValidationDisplayState {
  return useMemo(
    () => getValidationDisplayState({ result, value, hasInteracted }),
    [result, value, hasInteracted],
  );
}

// ============================================================================
// useCellValidation
// ============================================================================

/** Options for useCellValidation hook */
export interface CellValidationOptions {
  /** Initial value for the cell */
  initialValue: unknown;
  /** Whether to skip marking as interacted on initial mount */
  skipInitialInteraction?: boolean;
}

/** Return type for useCellValidation hook */
export interface CellValidationState {
  /** Current local value */
  value: unknown;
  /** Whether the cell has been interacted with */
  dirty: boolean;
  /** Update the value (marks as dirty) */
  setValue: (newValue: unknown) => void;
  /** Sync value from external source (e.g., calculations) */
  syncFromExternal: (externalValue: unknown) => void;
}

/**
 * Hook for managing cell-level validation state in data tables.
 *
 * Handles the complexity of:
 * - Local value state
 * - Dirty/interaction tracking
 * - External value updates (from calculations)
 * - Avoiding false positives on initial mount
 *
 * @param options - Initial value and configuration
 * @returns Cell validation state and methods
 *
 * @example
 * ```tsx
 * function DataTableCell({ cellValue, onChange }) {
 *   const cell = useCellValidation({ initialValue: cellValue });
 *
 *   // Sync when external value changes (e.g., from calculations)
 *   useEffect(() => {
 *     cell.syncFromExternal(cellValue);
 *   }, [cellValue]);
 *
 *   const handleChange = (newValue) => {
 *     cell.setValue(newValue);
 *     onChange(newValue);
 *   };
 *
 *   const showError = cell.dirty && hasValidationError;
 * }
 * ```
 */
export function useCellValidation({
  initialValue,
  skipInitialInteraction = true,
}: CellValidationOptions): CellValidationState {
  const [value, setValueState] = useState<unknown>(initialValue);
  const [dirty, setDirty] = useState(false);
  const hasMountedRef = useRef(false);

  // Mark as mounted after first render
  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  const setValue = useCallback((newValue: unknown) => {
    setDirty(true);
    setValueState(newValue);
  }, []);

  const syncFromExternal = useCallback(
    (externalValue: unknown) => {
      setValueState((prev: unknown) => {
        if (Object.is(prev, externalValue)) return prev;
        // Mark as dirty when value changes externally (via calculations)
        // Skip on initial mount to avoid showing errors before interaction
        if (skipInitialInteraction && hasMountedRef.current) {
          setDirty(true);
        } else if (!skipInitialInteraction) {
          setDirty(true);
        }
        return externalValue;
      });
    },
    [skipInitialInteraction],
  );

  return { value, dirty, setValue, syncFromExternal };
}

// ============================================================================
// useFormValidation
// ============================================================================

/** Return type for useFormValidation hook */
export interface FormValidationState<T extends Record<string, unknown>> {
  /** Current form data */
  formData: T;
  /** Set of touched field IDs */
  touchedFields: Set<string>;
  /** Update a single field value */
  updateField: (fieldId: string, value: unknown) => void;
  /** Update multiple fields at once (e.g., from calculations) */
  updateFields: (updates: Partial<T>, calculatedFieldIds?: string[]) => void;
  /** Check if a field has been touched */
  isTouched: (fieldId: string) => boolean;
  /** Mark a field as touched */
  markTouched: (fieldId: string) => void;
  /** Reset the form to initial values */
  reset: (newInitialValues?: T) => void;
}

/**
 * Hook for managing form-level validation state.
 *
 * Combines form data management with interaction tracking for validation display.
 *
 * @param initialValues - Initial form values
 * @returns Form validation state and methods
 *
 * @example
 * ```tsx
 * function EntryForm({ initial, onSubmit }) {
 *   const form = useFormValidation(initial);
 *
 *   const handleFieldChange = (fieldId, value) => {
 *     const calculated = applyCalculations({ ...form.formData, [fieldId]: value });
 *     form.updateFields(calculated.row, calculated.updatedFieldIds);
 *   };
 *
 *   return fields.map(field => {
 *     const showError = form.isTouched(field.id) && hasError;
 *     return <Field onChange={v => handleFieldChange(field.id, v)} />;
 *   });
 * }
 * ```
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
): FormValidationState<T> {
  const [formData, setFormData] = useState<T>(initialValues);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(
    () => new Set(),
  );

  const updateField = useCallback((fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setTouchedFields((prev) => {
      if (prev.has(fieldId)) return prev;
      const next = new Set(prev);
      next.add(fieldId);
      return next;
    });
  }, []);

  const updateFields = useCallback(
    (updates: Partial<T>, calculatedFieldIds: string[] = []) => {
      setFormData((prev) => ({ ...prev, ...updates }));
      if (calculatedFieldIds.length > 0) {
        setTouchedFields((prev) => {
          const next = new Set(prev);
          for (const id of calculatedFieldIds) {
            next.add(id);
          }
          return next;
        });
      }
    },
    [],
  );

  const isTouched = useCallback(
    (fieldId: string) => touchedFields.has(fieldId),
    [touchedFields],
  );

  const markTouched = useCallback((fieldId: string) => {
    setTouchedFields((prev) => {
      if (prev.has(fieldId)) return prev;
      const next = new Set(prev);
      next.add(fieldId);
      return next;
    });
  }, []);

  const reset = useCallback((newInitialValues?: T) => {
    setFormData(newInitialValues ?? initialValues);
    setTouchedFields(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    formData,
    touchedFields,
    updateField,
    updateFields,
    isTouched,
    markTouched,
    reset,
  };
}
