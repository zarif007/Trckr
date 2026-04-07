"use client";

import {
  validateField,
  sanitizeValue,
  getFieldIcon,
  type FieldMetadata,
} from "./utils";
import { DataTableInput } from "./data-table-input";
import { FormDialog } from "./form-dialog";
import { FieldWrapper } from "../../shared/FieldWrapper";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { applyFieldOverrides } from "@/lib/field-rules";
import type { FieldRuleOverride } from "@/lib/field-rules";
import {
  applyCompiledCalculationsForRow,
  compileCalculationsForGrid,
} from "@/lib/field-calculation";
import type { FieldCalculationRule } from "@/lib/functions/types";
import {
  getValidationDisplayState,
  markFieldsAsInteracted,
  computeValidationSummary,
} from "@/lib/field-validation";

export interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  fieldMetadata: FieldMetadata;
  /** Field ids in display order. If not provided, uses Object.keys(fieldMetadata). */
  fieldOrder?: string[];
  initialValues: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => void;
  /** When using "save & add another" (Shift+Enter), called instead of onSave. */
  onSaveAnother?: (values: Record<string, unknown>) => void;
  /** When a select/multiselect field changes, return extra field updates (e.g. from bindings) to merge into form. */
  getBindingUpdates?: (
    fieldId: string,
    value: unknown,
  ) => Record<string, unknown>;
  /** Resolve field overrides (hidden/required/disabled) based on current form values. */
  getFieldOverrides?: (
    values: Record<string, unknown>,
    fieldId: string,
  ) => FieldRuleOverride | undefined;
  /** Optional: "add" vs "edit" mode for different accents */
  mode?: "add" | "edit";
  /** Grid id for validation rowValues (expr rules may use gridId.fieldId). */
  gridId?: string;
  /** Calculations keyed by "gridId.fieldId" (target paths). */
  calculations?: Record<string, FieldCalculationRule>;
  /** Optional full grid data for accumulate (sum/reduce) rules that reference other grids. */
  gridData?: Record<string, Array<Record<string, unknown>>>;
}

export function EntryFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  fieldMetadata,
  fieldOrder,
  initialValues,
  onSave,
  onSaveAnother,
  getBindingUpdates,
  getFieldOverrides,
  mode = "add",
  gridId,
  calculations,
  gridData,
}: EntryFormDialogProps) {
  const orderedIds = useMemo(
    () => fieldOrder ?? Object.keys(fieldMetadata),
    [fieldOrder, fieldMetadata],
  );
  const [formData, setFormData] =
    useState<Record<string, unknown>>(initialValues);
  const [touchedFieldIds, setTouchedFieldIds] = useState<Set<string>>(
    () => new Set(),
  );

  const compiledCalculationPlan = useMemo(() => {
    if (!gridId || !calculations || Object.keys(calculations).length === 0)
      return null;
    return compileCalculationsForGrid(gridId, calculations);
  }, [calculations, gridId]);

  const applyCalculatedValues = useCallback(
    (
      values: Record<string, unknown>,
      changedFieldIds: string[],
    ): { row: Record<string, unknown>; updatedFieldIds: string[] } => {
      if (!compiledCalculationPlan)
        return { row: values, updatedFieldIds: [] };
      const result = applyCompiledCalculationsForRow({
        plan: compiledCalculationPlan,
        row: values,
        changedFieldIds,
        gridData,
      });
      return { row: result.row, updatedFieldIds: result.updatedFieldIds };
    },
    [compiledCalculationPlan, gridData],
  );

  const recordsEqual = (
    a: Record<string, unknown>,
    b: Record<string, unknown>,
  ) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!Object.is(a[key], b[key])) return false;
    }
    return true;
  };

  const rowValuesForValidation = useMemo(() => {
    const base = { ...formData };
    if (gridId) {
      for (const id of orderedIds) {
        base[`${gridId}.${id}`] = formData[id];
      }
    }
    return base;
  }, [formData, gridId, orderedIds]);

  // Only reset form when dialog opens; don't reset when parent re-renders (e.g. after "Add option")
  // so that the newly selected option is preserved in the form.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const base = initialValues ?? {};
      setFormData(applyCalculatedValues(base, orderedIds).row);
      setTouchedFieldIds(new Set());
    }
    prevOpenRef.current = open;
  }, [open, initialValues, applyCalculatedValues, orderedIds]);

  const validationSummary = useMemo(() => {
    let errorCount = 0;
    let warningCount = 0;

    for (const columnId of orderedIds) {
      const fieldInfo = fieldMetadata[columnId];
      if (!fieldInfo) continue;

      const overrides = getFieldOverrides?.(formData, columnId);
      const effectiveConfig = applyFieldOverrides(
        fieldInfo.config as Record<string, unknown> | null | undefined,
        overrides,
      );

      if (effectiveConfig?.isHidden || effectiveConfig?.isDisabled) continue;

      const result = validateField({
        value: formData[columnId],
        fieldId: columnId,
        fieldType: fieldInfo.type,
        config: effectiveConfig,
        rules: fieldInfo.validations,
        rowValues: rowValuesForValidation,
      });

      if (result.hasError) errorCount++;
      else if (result.hasWarning) warningCount++;
    }

    return { hasError: errorCount > 0, errorCount, warningCount };
  }, [
    formData,
    fieldMetadata,
    orderedIds,
    getFieldOverrides,
    rowValuesForValidation,
  ]);

  const handleSave = useCallback(() => {
    const resolved = applyCalculatedValues(formData, orderedIds).row;
    onSave(resolved);
    setFormData({});
    onOpenChange(false);
  }, [formData, onSave, onOpenChange, applyCalculatedValues, orderedIds]);

  const handleSaveAndContinue = useCallback(() => {
    if (!onSaveAnother) return;
    const resolved = applyCalculatedValues(formData, orderedIds).row;
    onSaveAnother(resolved);
    // Reset form for the next entry but keep dialog open
    const base = initialValues ?? {};
    setFormData(applyCalculatedValues(base, orderedIds).row);
    setTouchedFieldIds(new Set());
  }, [
    formData,
    onSaveAnother,
    initialValues,
    applyCalculatedValues,
    orderedIds,
  ]);

  const handleCancel = useCallback(() => {
    setFormData({});
    onOpenChange(false);
  }, [onOpenChange]);

  const fieldCount = orderedIds.filter((id) => fieldMetadata[id]).length;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submitLabel={submitLabel}
      fieldCount={fieldCount}
      disableSubmit={validationSummary.hasError}
      mode={mode}
      onSubmit={handleSave}
      onSubmitAndContinue={onSaveAnother ? handleSaveAndContinue : undefined}
      onCancel={handleCancel}
    >
      <div className="grid grid-cols-1 gap-4">
        {orderedIds.map((columnId, index) => {
          const fieldInfo = fieldMetadata[columnId];
          if (!fieldInfo) return null;
          const overrides = getFieldOverrides?.(formData, columnId);
          const effectiveConfig = applyFieldOverrides(
            fieldInfo.config as Record<string, unknown> | null | undefined,
            overrides,
          );
          if (effectiveConfig?.isHidden) return null;

          const value = formData[columnId] ?? "";
          const validationResult = validateField({
            value: formData[columnId],
            fieldId: columnId,
            fieldType: fieldInfo.type,
            config: effectiveConfig,
            rules: fieldInfo.validations,
            rowValues: rowValuesForValidation,
          });
          // Show validation on mount for non-empty values that fail validation.
          // Only hide "required" errors (empty values) until user interaction.
          const fieldValue = formData[columnId];
          const valueIsEmpty =
            fieldValue === undefined ||
            fieldValue === null ||
            fieldValue === "" ||
            (Array.isArray(fieldValue) && fieldValue.length === 0);
          const hasInteracted = touchedFieldIds.has(columnId);
          const showError =
            validationResult.hasError && (hasInteracted || !valueIsEmpty);
          const showWarning =
            validationResult.hasWarning &&
            !validationResult.hasError &&
            (hasInteracted || !valueIsEmpty);
          const Icon = getFieldIcon(fieldInfo.type);

          return (
            <div
              key={columnId}
              className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{
                animationDelay: `${index * 30}ms`,
                animationFillMode: "both",
              }}
            >
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {Icon && (
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                )}
                {String(fieldInfo.name)}
                {effectiveConfig?.isRequired === true && (
                  <span className="text-destructive/80">*</span>
                )}
              </label>
              <FieldWrapper
                error={showError}
                warning={showWarning}
                validationTitle={
                  validationResult.error ?? validationResult.warning ?? undefined
                }
              >
                <DataTableInput
                  formField
                  value={value}
                  onChange={(newValue, options) => {
                    const sanitized = sanitizeValue(
                      newValue,
                      fieldInfo.type,
                      effectiveConfig,
                    );
                    const bindingUpdates =
                      options?.bindingUpdates ??
                      ((fieldInfo.type === "options" ||
                        fieldInfo.type === "multiselect") &&
                      getBindingUpdates
                        ? (getBindingUpdates(columnId, sanitized) ?? {})
                        : {});
                    setFormData((prev) => {
                      let changed = !Object.is(prev[columnId], sanitized);
                      const next: Record<string, unknown> = changed
                        ? { ...prev, [columnId]: sanitized }
                        : { ...prev };
                      const changedKeys = new Set<string>([columnId]);

                      for (const [k, v] of Object.entries(bindingUpdates)) {
                        if (!Object.is(next[k], v)) {
                          next[k] = v;
                          changed = true;
                          changedKeys.add(k);
                        }
                      }
                      const { row: calculated, updatedFieldIds } =
                        applyCalculatedValues(next, Array.from(changedKeys));
                      if (!changed && recordsEqual(prev, calculated))
                        return prev;

                      // Mark directly changed fields and calculated fields as touched
                      setTouchedFieldIds((t) => {
                        const newTouched = new Set(t);
                        for (const k of changedKeys) newTouched.add(k);
                        for (const id of updatedFieldIds) newTouched.add(id);
                        return newTouched;
                      });

                      return calculated;
                    });
                  }}
                  type={fieldInfo.type}
                  options={fieldInfo.options}
                  config={effectiveConfig}
                  disabled={!!effectiveConfig?.isDisabled}
                  onAddOption={fieldInfo.onAddOption}
                  optionsGridFields={fieldInfo.optionsGridFields}
                  getBindingUpdatesFromRow={fieldInfo.getBindingUpdatesFromRow}
                  optionsSourceLabel={fieldInfo.optionsGridName}
                  className="h-10 w-full min-w-0 px-3 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0 rounded-sm"
                  autoFocus={index === 0}
                />
              </FieldWrapper>
              {showError && validationResult.error && (
                <p className="text-destructive text-xs flex items-center gap-1">
                  {validationResult.error}
                </p>
              )}
              {showWarning && !showError && validationResult.warning && (
                <p className="text-yellow-600 text-xs flex items-center gap-1">
                  {validationResult.warning}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </FormDialog>
  );
}
