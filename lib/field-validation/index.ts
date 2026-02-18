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

export function getValidationError({
  value,
  fieldId,
  fieldType,
  config,
  rules,
  rowValues,
}: ValidationInput): string | null {
  if ((!config || Object.keys(config).length === 0) && (!rules || rules.length === 0)) return null
  if (config?.isHidden || config?.isDisabled) return null

  const combinedRules = [...configRules(config), ...(rules ?? [])]

  for (const rule of combinedRules) {
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
      if (!STRING_TYPES.has(fieldType)) continue
      const s = typeof value === 'string' ? value : String(value ?? '')
      if (rule.type === 'minLength' && s.length < rule.value) return rule.message ?? defaultMessage(rule)
      if (rule.type === 'maxLength' && s.length > rule.value) return rule.message ?? defaultMessage(rule)
      continue
    }

    if (rule.type === 'expr') {
      const mergedRowValues = { ...(rowValues ?? {}) }
      if (fieldId) mergedRowValues[fieldId] = value
      const ctx: FunctionContext = {
        rowValues: mergedRowValues,
        fieldId,
        fieldConfig: config ?? null,
        fieldDataType: fieldType,
      }
      const error = evalExprRule(rule, ctx)
      if (error) return error
    }
  }

  if (NUMBER_TYPES.has(fieldType)) {
    if (!isEmpty(value)) {
      const n = parseNumber(value)
      if (Number.isNaN(n)) return 'Enter a valid number'
    }
  }

  return null
}
