import type { ValidationContext, ValidatorResult } from '../types'
import type { FieldValidationRule, ExprNode } from '@/lib/functions/types'
import { parsePath } from '@/lib/resolve-bindings'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isExprNode = (value: unknown): value is ExprNode => isRecord(value) && typeof value.op === 'string'

/** Binary ops may be stored as { left, right } or { args: [left, right] }. */
function getBinaryOperands(
  node: Record<string, unknown>,
): { left: unknown; right: unknown } | null {
  if (node.left != null && node.right != null) {
    return { left: node.left, right: node.right }
  }
  const args = node.args
  if (Array.isArray(args) && args.length >= 2 && args[0] != null && args[1] != null) {
    return { left: args[0], right: args[1] }
  }
  return null
}

function validateExprNode(
  node: ExprNode,
  ctx: ValidationContext,
  path: string,
): string[] {
  const errors: string[] = []

  switch (node.op) {
    case 'const':
      return errors
    case 'field': {
      const ref = node.fieldId
      if (typeof ref !== 'string' || ref.trim().length === 0) {
        errors.push(`${path}.fieldId must be a non-empty string`)
      } else if (ref.includes('.')) {
        if (!ctx.fieldPaths.has(ref)) {
          errors.push(`${path}.fieldId references missing field path "${ref}" (use gridId.fieldId)`)
        }
      } else if (!ctx.fieldIds.has(ref)) {
        errors.push(`${path}.fieldId references missing field "${ref}"`)
      }
      return errors
    }
    case 'add':
    case 'mul':
    case 'and':
    case 'or': {
      const args = (node as Extract<ExprNode, { op: 'add' | 'mul' | 'and' | 'or' }>).args
      if (!Array.isArray(args) || args.length === 0) {
        errors.push(`${path}.args must be a non-empty array`)
        return errors
      }
      args.forEach((arg, idx) => {
        if (!isExprNode(arg)) {
          errors.push(`${path}.args[${idx}] is not a valid expression node`)
          return
        }
        errors.push(...validateExprNode(arg, ctx, `${path}.args[${idx}]`))
      })
      return errors
    }
    case 'sub':
    case 'div':
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const pair = getBinaryOperands(node as Record<string, unknown>)
      if (!pair) {
        errors.push(`${path} must have .left and .right, or .args with two expression nodes`)
        return errors
      }
      if (!isExprNode(pair.left)) {
        errors.push(`${path}.left (or .args[0]) is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(pair.left, ctx, `${path}.left`))
      }
      if (!isExprNode(pair.right)) {
        errors.push(`${path}.right (or .args[1]) is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(pair.right, ctx, `${path}.right`))
      }
      return errors
    }
    case 'not': {
      const arg = (node as Extract<ExprNode, { op: 'not' }>).arg
      if (!isExprNode(arg)) {
        errors.push(`${path}.arg is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(arg, ctx, `${path}.arg`))
      }
      return errors
    }
    case 'if': {
      const triple = node as Extract<ExprNode, { op: 'if' }>
      if (!isExprNode(triple.cond)) {
        errors.push(`${path}.cond is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(triple.cond, ctx, `${path}.cond`))
      }
      if (!isExprNode(triple.then)) {
        errors.push(`${path}.then is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(triple.then, ctx, `${path}.then`))
      }
      if (!isExprNode(triple.else)) {
        errors.push(`${path}.else is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(triple.else, ctx, `${path}.else`))
      }
      return errors
    }
    case 'regex': {
      const regex = node as Extract<ExprNode, { op: 'regex' }>
      if (!isExprNode(regex.value)) {
        errors.push(`${path}.value is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(regex.value, ctx, `${path}.value`))
      }
      if (typeof regex.pattern !== 'string') {
        errors.push(`${path}.pattern must be a string`)
      } else {
        try {
          new RegExp(regex.pattern, regex.flags)
        } catch {
          errors.push(`${path}.pattern is not a valid regex`)
        }
      }
      if (regex.flags != null && typeof regex.flags !== 'string') {
        errors.push(`${path}.flags must be a string when provided`)
      }
      return errors
    }
    default:
      errors.push(`${path}.op is not a supported operator`)
      return errors
  }
}

/** Validation keys use gridId.fieldId (like bindings); legacy key is fieldId only. */
function getValidationKeyPath(key: string): { gridId: string | null; fieldId: string } | null {
  if (key.includes('.')) {
    const { gridId, fieldId } = parsePath(key)
    return gridId && fieldId ? { gridId, fieldId } : null
  }
  return { gridId: null, fieldId: key }
}

export function validateValidations(ctx: ValidationContext): ValidatorResult {
  const errors: string[] = []
  const validations = ctx.validations ?? {}

  for (const [key, rules] of Object.entries(validations)) {
    const parsed = getValidationKeyPath(key)
    if (!parsed) {
      errors.push(`validations key "${key}" must be "gridId.fieldId" or a single fieldId`)
      continue
    }
    const { gridId, fieldId } = parsed
    if (gridId != null) {
      if (!ctx.gridIds.has(gridId)) {
        errors.push(`validations key "${key}": grid "${gridId}" not found`)
        continue
      }
      if (!ctx.fieldPaths.has(key)) {
        errors.push(`validations key "${key}": field path "${key}" not found (field must be placed in layout for that grid)`)
        continue
      }
    } else {
      if (!ctx.fieldIds.has(fieldId)) {
        errors.push(`validations key "${key}": field "${fieldId}" not found`)
        continue
      }
    }

    if (!Array.isArray(rules)) {
      errors.push(`validations.${key} must be an array`)
      continue
    }

    rules.forEach((rule, index) => {
      const path = `validations.${key}[${index}]`
      if (!isRecord(rule) || typeof rule.type !== 'string') {
        errors.push(`${path}.type is required`)
        return
      }

      const typedRule = rule as FieldValidationRule
      switch (typedRule.type) {
        case 'required':
          return
        case 'min':
        case 'max':
        case 'minLength':
        case 'maxLength':
          if (typeof typedRule.value !== 'number' || Number.isNaN(typedRule.value)) {
            errors.push(`${path}.value must be a number`)
          }
          return
        case 'expr': {
          const expr = (rule as { expr?: unknown }).expr
          if (!isExprNode(expr)) {
            errors.push(`${path}.expr must be a valid expression node`)
            return
          }
          errors.push(...validateExprNode(expr, ctx, `${path}.expr`))
          return
        }
        default:
          errors.push(`${path}.type "${String((rule as { type?: unknown }).type)}" is not supported`)
          return
      }
    })
  }

  return errors.length > 0 ? { errors } : {}
}
