/**
 * Field Validation Engine
 *
 * High-performance validation system for tracker fields. Provides:
 * - Compiled validation plans with rule merging and normalization
 * - LRU caching with configurable limits
 * - Support for both config-based and expression-based rules
 * - Row-aware validation context for cross-field dependencies
 *
 * @module field-validation
 *
 * Performance characteristics:
 * - Plan compilation: O(n) where n = number of rules
 * - Validation execution: O(r) where r = number of rules to check
 * - Cache hit: O(1) lookup with fast signature generation
 *
 * Rule evaluation order:
 * 1. Config constraints (isRequired, min, max, minLength, maxLength)
 * 2. Custom validation rules in order
 * 3. Type-specific checks (e.g., numeric validation for number fields)
 *
 * @example
 * ```ts
 * const error = getValidationError({
 * value: 'test',
 * fieldId: 'name',
 * fieldType: 'string',
 * config: { isRequired: true, minLength: 3 },
 * rules: [{ type: 'maxLength', value: 100 }]
 * });
 * // Returns null if valid, error message string if invalid
 * ```
 */
import type {
  FieldValidationRule,
  FunctionContext,
} from "@/lib/functions/types";
import { evaluateExpr } from "@/lib/functions/evaluator";

// ============================================================================
// Types
// ============================================================================

/** Single validation issue with severity */
export interface ValidationIssue {
  /** Error or warning message */
  message: string;
  /** Severity level: errors block submission, warnings don't */
  severity: "error" | "warning";
  /** Rule type that triggered this issue (for debugging) */
  ruleType: FieldValidationRule["type"];
}

/** Complete validation result for a field */
export interface ValidationResult {
  /** First error message (for backward compat with string | null) */
  error: string | null;
  /** First warning message (null if none) */
  warning: string | null;
  /** All issues found (errors first, then warnings) */
  issues: ValidationIssue[];
  /** True if any error exists */
  hasError: boolean;
  /** True if any warning exists (but no errors) */
  hasWarning: boolean;
}

/** Input for field validation */
export interface ValidationInput {
  /** Value to validate */
  value: unknown;
  /** Field identifier (may include grid prefix) */
  fieldId: string;
  /** Field data type for type-specific validation */
  fieldType: string;
  /** Field configuration with built-in constraints */
  config?: {
    isRequired?: boolean;
    isDisabled?: boolean;
    isHidden?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    numberDecimalPlaces?: number;
    numberStep?: number;
    ratingMax?: number;
    ratingAllowHalf?: boolean;
    personAllowMultiple?: boolean;
    filesMaxCount?: number;
    filesMaxSizeMb?: number;
    statusOptions?: string[];
  } | null;
  /** Custom validation rules */
  rules?: FieldValidationRule[];
  /** Row values for expression rules (enables cross-field validation) */
  rowValues?: Record<string, unknown>;
}

/** Input for compiling a validation plan */
export interface CompileValidationPlanInput {
  fieldId: string;
  fieldType: string;
  config?: ValidationInput["config"];
  rules?: FieldValidationRule[];
}

/**
 * Pre-compiled validation plan.
 * Merges config constraints and custom rules into a single evaluation pipeline.
 */
export interface CompiledValidationPlan {
  fieldId: string;
  fieldType: string;
  config?: ValidationInput["config"];
  /** Combined rules: config-derived + custom rules */
  combinedRules: FieldValidationRule[];
  /** Whether any validation will actually run */
  hasAnyRuleInput: boolean;
  /** True if this is a string-like field type */
  isStringType: boolean;
  /** True if this is a numeric field type */
  isNumberType: boolean;
}

/** Input for validation with compiled plan */
export interface GetValidationErrorFromCompiledInput {
  plan: CompiledValidationPlan;
  value: unknown;
  rowValues?: Record<string, unknown>;
}

// ============================================================================
// Cache Configuration & Statistics
// ============================================================================

/** Maximum cache size before LRU eviction */
const COMPILED_VALIDATION_PLAN_CACHE_LIMIT = 2000;

/** Cache statistics for monitoring */
export interface ValidationCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

const validationCacheStats: ValidationCacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  size: 0,
};

/** Get current cache statistics */
export function getValidationCacheStats(): Readonly<ValidationCacheStats> {
  return { ...validationCacheStats };
}

/** Reset cache statistics */
export function resetValidationCacheStats(): void {
  validationCacheStats.hits = 0;
  validationCacheStats.misses = 0;
  validationCacheStats.evictions = 0;
}

/** Clear the validation plan cache (for testing) */
export function clearValidationCache(): void {
  compiledValidationPlanCache.clear();
  lruOrder.length = 0;
  validationCacheStats.size = 0;
}

// ============================================================================
// Constants & Utilities
// ============================================================================

const STRING_TYPES = new Set([
  "string",
  "text",
  "link",
  "email",
  "phone",
  "url",
]);
const NUMBER_TYPES = new Set(["number", "currency", "percentage", "rating"]);

/**
 * Check if a value is considered "empty" for validation purposes.
 * Re-exported from display.ts for internal use.
 */
export { isEmptyValue } from "./display";

/** @internal */
const isEmpty = (v: unknown) =>
  v === undefined ||
  v === null ||
  v === "" ||
  (Array.isArray(v) && v.length === 0);

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
};

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value: string): boolean =>
  /^[+\d\s().-]{7,20}$/.test(value);
const isValidUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const defaultMessage = (rule: FieldValidationRule): string => {
  if (rule.type === "required") return "Required";
  if (rule.type === "min") return `Must be at least ${rule.value}`;
  if (rule.type === "max") return `Must be at most ${rule.value}`;
  if (rule.type === "minLength") return `At least ${rule.value} characters`;
  if (rule.type === "maxLength") return `At most ${rule.value} characters`;
  return "Invalid value";
};

const configRules = (
  config?: ValidationInput["config"],
): FieldValidationRule[] => {
  if (!config) return [];
  const rules: FieldValidationRule[] = [];
  if (config.isRequired) rules.push({ type: "required" });
  if (typeof config.min === "number")
    rules.push({ type: "min", value: config.min });
  if (typeof config.max === "number")
    rules.push({ type: "max", value: config.max });
  if (typeof config.minLength === "number")
    rules.push({ type: "minLength", value: config.minLength });
  if (typeof config.maxLength === "number")
    rules.push({ type: "maxLength", value: config.maxLength });
  return rules;
};

const rulesSignatureCache = new WeakMap<FieldValidationRule[], string>();
const compiledValidationPlanCache = new Map<string, CompiledValidationPlan>();
/** LRU tracking: oldest keys first */
const lruOrder: string[] = [];

function getConfigSignature(config?: ValidationInput["config"]): string {
  if (!config) return "";
  return [
    config.isRequired === true ? "1" : "0",
    config.isDisabled === true ? "1" : "0",
    config.isHidden === true ? "1" : "0",
    typeof config.min === "number" ? String(config.min) : "",
    typeof config.max === "number" ? String(config.max) : "",
    typeof config.minLength === "number" ? String(config.minLength) : "",
    typeof config.maxLength === "number" ? String(config.maxLength) : "",
    typeof config.numberDecimalPlaces === "number"
      ? String(config.numberDecimalPlaces)
      : "",
    typeof config.numberStep === "number" ? String(config.numberStep) : "",
    typeof config.ratingMax === "number" ? String(config.ratingMax) : "",
    config.ratingAllowHalf === true ? "1" : "0",
    config.personAllowMultiple === true ? "1" : "0",
    typeof config.filesMaxCount === "number"
      ? String(config.filesMaxCount)
      : "",
    typeof config.filesMaxSizeMb === "number"
      ? String(config.filesMaxSizeMb)
      : "",
    Array.isArray(config.statusOptions)
      ? JSON.stringify(config.statusOptions)
      : "",
  ].join("|");
}

function getRulesSignature(rules?: FieldValidationRule[]): string {
  if (!rules || rules.length === 0) return "";
  const cached = rulesSignatureCache.get(rules);
  if (cached) return cached;
  const signature = JSON.stringify(rules);
  rulesSignatureCache.set(rules, signature);
  return signature;
}

function getCompiledPlanCacheKey({
  fieldId,
  fieldType,
  config,
  rules,
}: CompileValidationPlanInput): string {
  const configSignature = getConfigSignature(config);
  const rulesSignature = getRulesSignature(rules);
  return `${fieldId}::${fieldType}::${configSignature}::${rulesSignature}`;
}

/**
 * Get or create a cached compiled validation plan.
 * Uses LRU eviction when cache limit is reached.
 * @internal
 */
function getCachedCompiledValidationPlan(
  input: CompileValidationPlanInput,
): CompiledValidationPlan {
  const cacheKey = getCompiledPlanCacheKey(input);
  const cached = compiledValidationPlanCache.get(cacheKey);

  if (cached) {
    // Move to end of LRU (most recently used)
    const idx = lruOrder.indexOf(cacheKey);
    if (idx > -1) {
      lruOrder.splice(idx, 1);
      lruOrder.push(cacheKey);
    }
    validationCacheStats.hits++;
    return cached;
  }

  validationCacheStats.misses++;
  const compiled = compileValidationPlan(input);

  // Evict oldest entries if at capacity
  while (
    compiledValidationPlanCache.size >= COMPILED_VALIDATION_PLAN_CACHE_LIMIT &&
    lruOrder.length > 0
  ) {
    const oldest = lruOrder.shift();
    if (oldest) {
      compiledValidationPlanCache.delete(oldest);
      validationCacheStats.evictions++;
    }
  }

  compiledValidationPlanCache.set(cacheKey, compiled);
  lruOrder.push(cacheKey);
  validationCacheStats.size = compiledValidationPlanCache.size;

  return compiled;
}

const evalExprRule = (
  rule: Extract<FieldValidationRule, { type: "expr" }>,
  ctx: FunctionContext,
): string | null => {
  const result = evaluateExpr(rule.expr, ctx);
  if (typeof result === "boolean") {
    return result ? null : (rule.message ?? "Invalid value");
  }
  if (typeof result === "string") {
    return result.length > 0 ? result : (rule.message ?? "Invalid value");
  }
  if (result == null) return rule.message ?? "Invalid value";
  return Boolean(result) ? null : (rule.message ?? "Invalid value");
};

/**
 * Compile a validation plan from field config and rules.
 *
 * Merges config-derived constraints (isRequired, min/max, length limits)
 * with custom rules into a single evaluation pipeline.
 *
 * @param input - Field ID, type, config, and custom rules
 * @returns Compiled plan ready for validation
 *
 * @example
 * ```ts
 * const plan = compileValidationPlan({
 * fieldId: 'amount',
 * fieldType: 'number',
 * config: { min: 0, max: 1000 },
 * rules: [{ type: 'required' }]
 * });
 * ```
 */
export function compileValidationPlan({
  fieldId,
  fieldType,
  config,
  rules,
}: CompileValidationPlanInput): CompiledValidationPlan {
  const combinedRules = [
    ...configRules(config),
    ...(rules ?? []).filter((r) => r.enabled !== false),
  ];
  return {
    fieldId,
    fieldType,
    config,
    combinedRules,
    hasAnyRuleInput:
      (!!config && Object.keys(config).length > 0) ||
      !!(rules && rules.length > 0),
    isStringType: STRING_TYPES.has(fieldType),
    isNumberType: NUMBER_TYPES.has(fieldType),
  };
}

/**
 * Validate a value using a pre-compiled plan.
 *
 * This is the optimized path when you have a cached plan.
 * Returns null if valid, or an error message string if invalid.
 *
 * @param input - Plan, value, and optional row values for cross-field validation
 * @returns null if valid, error message string if invalid
 *
 * @example
 * ```ts
 * const plan = compileValidationPlan({ fieldId: 'qty', fieldType: 'number', config: { min: 1 } });
 * const error = getValidationErrorFromCompiled({ plan, value: 0 });
 * // error === 'Must be at least 1'
 * ```
 */
export function getValidationErrorFromCompiled({
  plan,
  value,
  rowValues,
}: GetValidationErrorFromCompiledInput): string | null {
  if (!plan.hasAnyRuleInput) return null;
  const { config } = plan;
  if (config?.isHidden || config?.isDisabled) return null;

  for (const rule of plan.combinedRules) {
    if (rule.type === "required") {
      if (isEmpty(value)) return rule.message ?? defaultMessage(rule);
      continue;
    }

    if (rule.type === "min" || rule.type === "max") {
      if (isEmpty(value)) continue;
      const n = parseNumber(value);
      if (Number.isNaN(n)) return rule.message ?? "Enter a valid number";
      if (rule.type === "min" && n < rule.value)
        return rule.message ?? defaultMessage(rule);
      if (rule.type === "max" && n > rule.value)
        return rule.message ?? defaultMessage(rule);
      continue;
    }

    if (rule.type === "minLength" || rule.type === "maxLength") {
      if (!plan.isStringType) continue;
      const s = typeof value === "string" ? value : String(value ?? "");
      if (rule.type === "minLength" && s.length < rule.value)
        return rule.message ?? defaultMessage(rule);
      if (rule.type === "maxLength" && s.length > rule.value)
        return rule.message ?? defaultMessage(rule);
      continue;
    }

    if (rule.type === "expr") {
      const mergedRowValues = { ...(rowValues ?? {}) };
      if (plan.fieldId) mergedRowValues[plan.fieldId] = value;
      const ctx: FunctionContext = {
        rowValues: mergedRowValues,
        fieldId: plan.fieldId,
        fieldConfig: config ?? null,
        fieldDataType: plan.fieldType,
      };
      const error = evalExprRule(rule, ctx);
      if (error) return error;
    }
  }

  if (plan.isNumberType) {
    if (!isEmpty(value)) {
      const n = parseNumber(value);
      if (Number.isNaN(n)) return "Enter a valid number";
    }
  }

  if (plan.fieldType === "email" && !isEmpty(value)) {
    if (!isValidEmail(String(value).trim()))
      return "Enter a valid email address";
  }

  if (plan.fieldType === "phone" && !isEmpty(value)) {
    if (!isValidPhone(String(value).trim()))
      return "Enter a valid phone number";
  }

  if (
    (plan.fieldType === "url" || plan.fieldType === "link") &&
    !isEmpty(value)
  ) {
    if (!isValidUrl(String(value).trim())) return "Enter a valid URL";
  }

  if (
    plan.fieldType === "status" &&
    !isEmpty(value) &&
    Array.isArray(config?.statusOptions) &&
    config.statusOptions.length > 0
  ) {
    if (!config.statusOptions.includes(String(value)))
      return "Value must match a configured status option";
  }

  if (plan.fieldType === "rating" && !isEmpty(value)) {
    const rating = parseNumber(value);
    if (Number.isNaN(rating)) return "Enter a valid rating";
    const maxRating =
      typeof config?.ratingMax === "number" ? config.ratingMax : 5;
    if (rating < 0 || rating > maxRating)
      return `Rating must be between 0 and ${maxRating}`;
    const step =
      typeof config?.numberStep === "number"
        ? config.numberStep
        : config?.ratingAllowHalf
          ? 0.5
          : 1;
    if (step > 0) {
      const normalized = rating / step;
      if (Math.abs(normalized - Math.round(normalized)) > 1e-9)
        return `Rating must use increments of ${step}`;
    }
  }

  if (plan.fieldType === "person" && !isEmpty(value)) {
    if (config?.personAllowMultiple) {
      if (!Array.isArray(value)) return "Value must be a list of people";
      if (
        value.some((entry) => typeof entry !== "string" || entry.trim() === "")
      )
        return "Each person must be a non-empty string";
    } else if (typeof value !== "string" || value.trim() === "") {
      return "Value must be a person name";
    }
  }

  if (plan.fieldType === "files" && !isEmpty(value)) {
    if (!Array.isArray(value)) return "Value must be a list of files";
    if (
      typeof config?.filesMaxCount === "number" &&
      value.length > config.filesMaxCount
    ) {
      return `No more than ${config.filesMaxCount} files allowed`;
    }
  }

  return null;
}

/**
 * Validate a field value with severity support (errors and warnings).
 *
 * Evaluates all validation rules and returns a structured result containing
 * both errors (which block submission) and warnings (which don't block).
 * Issues are sorted with errors first, warnings second.
 *
 * @param input - Complete validation input
 * @returns ValidationResult with error, warning, and all issues
 *
 * @example
 * ```ts
 * const result = validateField({
 *   value: 5,
 *   fieldId: 'qty',
 *   fieldType: 'number',
 *   config: { min: 10 },
 *   rules: [
 *     { type: 'min', value: 10, severity: 'error', message: 'Too low' },
 *     { type: 'max', value: 100, severity: 'warning', message: 'Consider lower quantity' }
 *   ]
 * });
 * // result.hasError === true, result.error === 'Too low'
 * // result.hasWarning === false (error takes precedence)
 * ```
 */
export function validateField({
  value,
  fieldId,
  fieldType,
  config,
  rules,
  rowValues,
}: ValidationInput): ValidationResult {
  const plan = getCachedCompiledValidationPlan({
    fieldId,
    fieldType,
    config,
    rules,
  });

  const issues: ValidationIssue[] = [];

  // Early exit if no validation needed
  if (!plan.hasAnyRuleInput) {
    return {
      error: null,
      warning: null,
      issues: [],
      hasError: false,
      hasWarning: false,
    };
  }

  // Skip validation if field is hidden or disabled
  if (config?.isHidden || config?.isDisabled) {
    return {
      error: null,
      warning: null,
      issues: [],
      hasError: false,
      hasWarning: false,
    };
  }

  // Evaluate each rule and collect issues
  for (const rule of plan.combinedRules) {
    let message: string | null = null;
    const severity = rule.severity ?? "error"; // Default to error for backward compat

    if (rule.type === "required") {
      if (isEmpty(value)) {
        message = rule.message ?? defaultMessage(rule);
      }
    } else if (rule.type === "min" || rule.type === "max") {
      if (!isEmpty(value)) {
        const n = parseNumber(value);
        if (Number.isNaN(n)) {
          message = rule.message ?? "Enter a valid number";
        } else if (rule.type === "min" && n < rule.value) {
          message = rule.message ?? defaultMessage(rule);
        } else if (rule.type === "max" && n > rule.value) {
          message = rule.message ?? defaultMessage(rule);
        }
      }
    } else if (rule.type === "minLength" || rule.type === "maxLength") {
      if (plan.isStringType) {
        const s = typeof value === "string" ? value : String(value ?? "");
        if (rule.type === "minLength" && s.length < rule.value) {
          message = rule.message ?? defaultMessage(rule);
        } else if (rule.type === "maxLength" && s.length > rule.value) {
          message = rule.message ?? defaultMessage(rule);
        }
      }
    } else if (rule.type === "expr") {
      const mergedRowValues = { ...(rowValues ?? {}) };
      if (plan.fieldId) mergedRowValues[plan.fieldId] = value;
      const ctx: FunctionContext = {
        rowValues: mergedRowValues,
        fieldId: plan.fieldId,
        fieldConfig: config ?? null,
        fieldDataType: plan.fieldType,
      };
      message = evalExprRule(rule, ctx);
    }

    if (message) {
      issues.push({ message, severity, ruleType: rule.type });
    }
  }

  // Type-specific validation (these are always errors, not warnings)
  if (plan.isNumberType && !isEmpty(value)) {
    const n = parseNumber(value);
    if (Number.isNaN(n)) {
      issues.push({
        message: "Enter a valid number",
        severity: "error",
        ruleType: "min", // Arbitrary, just for type safety
      });
    }
  }

  if (plan.fieldType === "email" && !isEmpty(value)) {
    if (!isValidEmail(String(value).trim())) {
      issues.push({
        message: "Enter a valid email address",
        severity: "error",
        ruleType: "expr",
      });
    }
  }

  if (plan.fieldType === "phone" && !isEmpty(value)) {
    if (!isValidPhone(String(value).trim())) {
      issues.push({
        message: "Enter a valid phone number",
        severity: "error",
        ruleType: "expr",
      });
    }
  }

  if (
    (plan.fieldType === "url" || plan.fieldType === "link") &&
    !isEmpty(value)
  ) {
    if (!isValidUrl(String(value).trim())) {
      issues.push({
        message: "Enter a valid URL",
        severity: "error",
        ruleType: "expr",
      });
    }
  }

  if (
    plan.fieldType === "status" &&
    !isEmpty(value) &&
    Array.isArray(config?.statusOptions) &&
    config.statusOptions.length > 0
  ) {
    if (!config.statusOptions.includes(String(value))) {
      issues.push({
        message: "Value must match a configured status option",
        severity: "error",
        ruleType: "expr",
      });
    }
  }

  if (plan.fieldType === "rating" && !isEmpty(value)) {
    const rating = parseNumber(value);
    if (Number.isNaN(rating)) {
      issues.push({
        message: "Enter a valid rating",
        severity: "error",
        ruleType: "min",
      });
    } else {
      const maxRating =
        typeof config?.ratingMax === "number" ? config.ratingMax : 5;
      if (rating < 0 || rating > maxRating) {
        issues.push({
          message: `Rating must be between 0 and ${maxRating}`,
          severity: "error",
          ruleType: "min",
        });
      } else {
        const step =
          typeof config?.numberStep === "number"
            ? config.numberStep
            : config?.ratingAllowHalf
              ? 0.5
              : 1;
        if (step > 0) {
          const normalized = rating / step;
          if (Math.abs(normalized - Math.round(normalized)) > 1e-9) {
            issues.push({
              message: `Rating must use increments of ${step}`,
              severity: "error",
              ruleType: "min",
            });
          }
        }
      }
    }
  }

  if (plan.fieldType === "person" && !isEmpty(value)) {
    if (config?.personAllowMultiple) {
      if (!Array.isArray(value)) {
        issues.push({
          message: "Value must be a list of people",
          severity: "error",
          ruleType: "expr",
        });
      } else if (
        value.some((entry) => typeof entry !== "string" || entry.trim() === "")
      ) {
        issues.push({
          message: "Each person must be a non-empty string",
          severity: "error",
          ruleType: "expr",
        });
      }
    } else if (typeof value !== "string" || value.trim() === "") {
      issues.push({
        message: "Value must be a person name",
        severity: "error",
        ruleType: "expr",
      });
    }
  }

  if (plan.fieldType === "files" && !isEmpty(value)) {
    if (!Array.isArray(value)) {
      issues.push({
        message: "Value must be a list of files",
        severity: "error",
        ruleType: "expr",
      });
    } else if (
      typeof config?.filesMaxCount === "number" &&
      value.length > config.filesMaxCount
    ) {
      issues.push({
        message: `No more than ${config.filesMaxCount} files allowed`,
        severity: "error",
        ruleType: "max",
      });
    }
  }

  // Sort issues: errors first, warnings second
  issues.sort((a, b) => {
    if (a.severity === "error" && b.severity === "warning") return -1;
    if (a.severity === "warning" && b.severity === "error") return 1;
    return 0;
  });

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    error: errors[0]?.message ?? null,
    warning: warnings[0]?.message ?? null,
    issues,
    hasError: errors.length > 0,
    hasWarning: warnings.length > 0,
  };
}

/**
 * Validate a field value and return error message (backward compatible).
 *
 * This is a convenience wrapper around validateField() that returns only
 * the first error message. Warnings are ignored. For severity-aware validation,
 * use validateField() directly.
 *
 * Automatically handles plan compilation and caching.
 *
 * @param input - Complete validation input
 * @returns null if valid, error message string if invalid (warnings ignored)
 *
 * @example
 * ```ts
 * const error = getValidationError({
 * value: '',
 * fieldId: 'email',
 * fieldType: 'string',
 * config: { isRequired: true },
 * rules: [{ type: 'expr', expr: { op: 'regex', ... }, message: 'Invalid email' }]
 * });
 * // Returns null if valid, error message if invalid
 * ```
 */
export function getValidationError(input: ValidationInput): string | null {
  return validateField(input).error;
}

// ============================================================================
// Re-exports from submodules
// ============================================================================

// Display utilities
export {
  getValidationDisplayState,
  addInteractedFields,
  markFieldsAsInteracted,
  computeValidationSummary,
  type ValidationDisplayOptions,
  type ValidationDisplayState,
  type ValidationSummary,
} from "./display";

// React hooks (client-side only)
export {
  useInteractionTracking,
  useFieldValidationDisplay,
  useCellValidation,
  useFormValidation,
  type InteractionTrackingState,
  type FieldValidationDisplayInput,
  type CellValidationOptions,
  type CellValidationState,
  type FormValidationState,
} from "./hooks";
