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
 *   value: 'test',
 *   fieldId: 'name',
 *   fieldType: 'string',
 *   config: { isRequired: true, minLength: 3 },
 *   rules: [{ type: 'maxLength', value: 100 }]
 * });
 * // Returns null if valid, error message string if invalid
 * ```
 */
import type { FieldValidationRule, FunctionContext } from '@/lib/functions/types'
import { evaluateExpr } from '@/lib/functions/evaluator'

// ============================================================================
// Types
// ============================================================================

/** Input for field validation */
export interface ValidationInput {
  /** Value to validate */
  value: unknown
  /** Field identifier (may include grid prefix) */
  fieldId: string
  /** Field data type for type-specific validation */
  fieldType: string
  /** Field configuration with built-in constraints */
  config?: {
    isRequired?: boolean
    isDisabled?: boolean
    isHidden?: boolean
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  } | null
  /** Custom validation rules */
  rules?: FieldValidationRule[]
  /** Row values for expression rules (enables cross-field validation) */
  rowValues?: Record<string, unknown>
}

/** Input for compiling a validation plan */
export interface CompileValidationPlanInput {
  fieldId: string
  fieldType: string
  config?: ValidationInput['config']
  rules?: FieldValidationRule[]
}

/**
 * Pre-compiled validation plan.
 * Merges config constraints and custom rules into a single evaluation pipeline.
 */
export interface CompiledValidationPlan {
  fieldId: string
  fieldType: string
  config?: ValidationInput['config']
  /** Combined rules: config-derived + custom rules */
  combinedRules: FieldValidationRule[]
  /** Whether any validation will actually run */
  hasAnyRuleInput: boolean
  /** True if this is a string-like field type */
  isStringType: boolean
  /** True if this is a numeric field type */
  isNumberType: boolean
}

/** Input for validation with compiled plan */
export interface GetValidationErrorFromCompiledInput {
  plan: CompiledValidationPlan
  value: unknown
  rowValues?: Record<string, unknown>
}

// ============================================================================
// Cache Configuration & Statistics
// ============================================================================

/** Maximum cache size before LRU eviction */
const COMPILED_VALIDATION_PLAN_CACHE_LIMIT = 2000

/** Cache statistics for monitoring */
export interface ValidationCacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
}

const validationCacheStats: ValidationCacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 }

/** Get current cache statistics */
export function getValidationCacheStats(): Readonly<ValidationCacheStats> {
  return { ...validationCacheStats }
}

/** Reset cache statistics */
export function resetValidationCacheStats(): void {
  validationCacheStats.hits = 0
  validationCacheStats.misses = 0
  validationCacheStats.evictions = 0
}

/** Clear the validation plan cache (for testing) */
export function clearValidationCache(): void {
  compiledValidationPlanCache.clear()
  lruOrder.length = 0
  validationCacheStats.size = 0
}

// ============================================================================
// Constants & Utilities
// ============================================================================

const STRING_TYPES = new Set(['string', 'text', 'link'])
const NUMBER_TYPES = new Set(['number', 'currency', 'percentage'])

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return Number.NaN
}

const defaultMessage = (rule: FieldValidationRule): string => {
  if (rule.type === 'required') return 'Required'
  if (rule.type === 'min') return `Must be at least ${rule.value}`
  if (rule.type === 'max') return `Must be at most ${rule.value}`
  if (rule.type === 'minLength') return `At least ${rule.value} characters`
  if (rule.type === 'maxLength') return `At most ${rule.value} characters`
  return 'Invalid value'
}

const configRules = (config?: ValidationInput['config']): FieldValidationRule[] => {
  if (!config) return []
  const rules: FieldValidationRule[] = []
  if (config.isRequired) rules.push({ type: 'required' })
  if (typeof config.min === 'number') rules.push({ type: 'min', value: config.min })
  if (typeof config.max === 'number') rules.push({ type: 'max', value: config.max })
  if (typeof config.minLength === 'number') rules.push({ type: 'minLength', value: config.minLength })
  if (typeof config.maxLength === 'number') rules.push({ type: 'maxLength', value: config.maxLength })
  return rules
}

const rulesSignatureCache = new WeakMap<FieldValidationRule[], string>()
const compiledValidationPlanCache = new Map<string, CompiledValidationPlan>()
/** LRU tracking: oldest keys first */
const lruOrder: string[] = []

function getConfigSignature(config?: ValidationInput['config']): string {
  if (!config) return ''
  return [
    config.isRequired === true ? '1' : '0',
    config.isDisabled === true ? '1' : '0',
    config.isHidden === true ? '1' : '0',
    typeof config.min === 'number' ? String(config.min) : '',
    typeof config.max === 'number' ? String(config.max) : '',
    typeof config.minLength === 'number' ? String(config.minLength) : '',
    typeof config.maxLength === 'number' ? String(config.maxLength) : '',
  ].join('|')
}

function getRulesSignature(rules?: FieldValidationRule[]): string {
  if (!rules || rules.length === 0) return ''
  const cached = rulesSignatureCache.get(rules)
  if (cached) return cached
  const signature = JSON.stringify(rules)
  rulesSignatureCache.set(rules, signature)
  return signature
}

function getCompiledPlanCacheKey({
  fieldId,
  fieldType,
  config,
  rules,
}: CompileValidationPlanInput): string {
  const configSignature = getConfigSignature(config)
  const rulesSignature = getRulesSignature(rules)
  return `${fieldId}::${fieldType}::${configSignature}::${rulesSignature}`
}

/**
 * Get or create a cached compiled validation plan.
 * Uses LRU eviction when cache limit is reached.
 * @internal
 */
function getCachedCompiledValidationPlan(input: CompileValidationPlanInput): CompiledValidationPlan {
  const cacheKey = getCompiledPlanCacheKey(input)
  const cached = compiledValidationPlanCache.get(cacheKey)
  
  if (cached) {
    // Move to end of LRU (most recently used)
    const idx = lruOrder.indexOf(cacheKey)
    if (idx > -1) {
      lruOrder.splice(idx, 1)
      lruOrder.push(cacheKey)
    }
    validationCacheStats.hits++
    return cached
  }

  validationCacheStats.misses++
  const compiled = compileValidationPlan(input)
  
  // Evict oldest entries if at capacity
  while (compiledValidationPlanCache.size >= COMPILED_VALIDATION_PLAN_CACHE_LIMIT && lruOrder.length > 0) {
    const oldest = lruOrder.shift()
    if (oldest) {
      compiledValidationPlanCache.delete(oldest)
      validationCacheStats.evictions++
    }
  }
  
  compiledValidationPlanCache.set(cacheKey, compiled)
  lruOrder.push(cacheKey)
  validationCacheStats.size = compiledValidationPlanCache.size
  
  return compiled
}

const evalExprRule = (
  rule: Extract<FieldValidationRule, { type: 'expr' }>,
  ctx: FunctionContext,
): string | null => {
  const result = evaluateExpr(rule.expr, ctx)
  if (typeof result === 'boolean') {
    return result ? null : (rule.message ?? 'Invalid value')
  }
  if (typeof result === 'string') {
    return result.length > 0 ? result : (rule.message ?? 'Invalid value')
  }
  if (result == null) return rule.message ?? 'Invalid value'
  return Boolean(result) ? null : (rule.message ?? 'Invalid value')
}

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
 *   fieldId: 'amount',
 *   fieldType: 'number',
 *   config: { min: 0, max: 1000 },
 *   rules: [{ type: 'required' }]
 * });
 * ```
 */
export function compileValidationPlan({
  fieldId,
  fieldType,
  config,
  rules,
}: CompileValidationPlanInput): CompiledValidationPlan {
  const combinedRules = [...configRules(config), ...(rules ?? [])]
  return {
    fieldId,
    fieldType,
    config,
    combinedRules,
    hasAnyRuleInput: (!!config && Object.keys(config).length > 0) || !!(rules && rules.length > 0),
    isStringType: STRING_TYPES.has(fieldType),
    isNumberType: NUMBER_TYPES.has(fieldType),
  }
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
  if (!plan.hasAnyRuleInput) return null
  const { config } = plan
  if (config?.isHidden || config?.isDisabled) return null

  for (const rule of plan.combinedRules) {
    if (rule.type === 'required') {
      if (isEmpty(value)) return rule.message ?? defaultMessage(rule)
      continue
    }

    if (rule.type === 'min' || rule.type === 'max') {
      if (isEmpty(value)) continue
      const n = parseNumber(value)
      if (Number.isNaN(n)) return rule.message ?? 'Enter a valid number'
      if (rule.type === 'min' && n < rule.value) return rule.message ?? defaultMessage(rule)
      if (rule.type === 'max' && n > rule.value) return rule.message ?? defaultMessage(rule)
      continue
    }

    if (rule.type === 'minLength' || rule.type === 'maxLength') {
      if (!plan.isStringType) continue
      const s = typeof value === 'string' ? value : String(value ?? '')
      if (rule.type === 'minLength' && s.length < rule.value) return rule.message ?? defaultMessage(rule)
      if (rule.type === 'maxLength' && s.length > rule.value) return rule.message ?? defaultMessage(rule)
      continue
    }

    if (rule.type === 'expr') {
      const mergedRowValues = { ...(rowValues ?? {}) }
      if (plan.fieldId) mergedRowValues[plan.fieldId] = value
      const ctx: FunctionContext = {
        rowValues: mergedRowValues,
        fieldId: plan.fieldId,
        fieldConfig: config ?? null,
        fieldDataType: plan.fieldType,
      }
      const error = evalExprRule(rule, ctx)
      if (error) return error
    }
  }

  if (plan.isNumberType) {
    if (!isEmpty(value)) {
      const n = parseNumber(value)
      if (Number.isNaN(n)) return 'Enter a valid number'
    }
  }

  return null
}

/**
 * Validate a field value (main entry point).
 * 
 * Automatically handles plan compilation and caching.
 * For repeated validations of the same field config, consider using
 * compileValidationPlan + getValidationErrorFromCompiled directly.
 * 
 * @param input - Complete validation input
 * @returns null if valid, error message string if invalid
 * 
 * @example
 * ```ts
 * const error = getValidationError({
 *   value: '',
 *   fieldId: 'email',
 *   fieldType: 'string',
 *   config: { isRequired: true },
 *   rules: [{ type: 'expr', expr: { op: 'regex', ... }, message: 'Invalid email' }]
 * });
 * ```
 */
export function getValidationError({
  value,
  fieldId,
  fieldType,
  config,
  rules,
  rowValues,
}: ValidationInput): string | null {
  const plan = getCachedCompiledValidationPlan({
    fieldId,
    fieldType,
    config,
    rules,
  })
  return getValidationErrorFromCompiled({
    plan,
    value,
    rowValues,
  })
}
