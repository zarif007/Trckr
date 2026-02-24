import type { FieldValidationRule, FunctionContext } from '@/lib/functions/types'
import { evaluateExpr } from '@/lib/functions/evaluator'

export interface ValidationInput {
  value: unknown
  fieldId: string
  fieldType: string
  config?: {
    isRequired?: boolean
    isDisabled?: boolean
    isHidden?: boolean
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  } | null
  rules?: FieldValidationRule[]
  rowValues?: Record<string, unknown>
}

export interface CompileValidationPlanInput {
  fieldId: string
  fieldType: string
  config?: ValidationInput['config']
  rules?: FieldValidationRule[]
}

export interface CompiledValidationPlan {
  fieldId: string
  fieldType: string
  config?: ValidationInput['config']
  combinedRules: FieldValidationRule[]
  hasAnyRuleInput: boolean
  isStringType: boolean
  isNumberType: boolean
}

export interface GetValidationErrorFromCompiledInput {
  plan: CompiledValidationPlan
  value: unknown
  rowValues?: Record<string, unknown>
}

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
const COMPILED_VALIDATION_PLAN_CACHE_LIMIT = 2000

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

function getCachedCompiledValidationPlan(input: CompileValidationPlanInput): CompiledValidationPlan {
  const cacheKey = getCompiledPlanCacheKey(input)
  const cached = compiledValidationPlanCache.get(cacheKey)
  if (cached) return cached

  const compiled = compileValidationPlan(input)
  if (compiledValidationPlanCache.size >= COMPILED_VALIDATION_PLAN_CACHE_LIMIT) {
    compiledValidationPlanCache.clear()
  }
  compiledValidationPlanCache.set(cacheKey, compiled)
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
