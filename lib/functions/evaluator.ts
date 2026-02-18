import type { ExprNode, FunctionContext } from './types'
import { getExprOp } from './registry'

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return Number.NaN
}

const isTruthy = (value: unknown): boolean => Boolean(value)

/** Binary ops may be stored as { left, right } or { args: [left, right] }. */
function getBinaryOperands(
  expr: Record<string, unknown>,
): { left: ExprNode; right: ExprNode } | null {
  if (expr.left != null && expr.right != null) {
    return { left: expr.left as ExprNode, right: expr.right as ExprNode }
  }
  const args = expr.args
  if (Array.isArray(args) && args.length >= 2 && args[0] != null && args[1] != null) {
    return { left: args[0] as ExprNode, right: args[1] as ExprNode }
  }
  return null
}

export function evaluateExpr(expr: ExprNode, ctx: FunctionContext): unknown {
  if (expr == null || typeof expr !== 'object' || !('op' in expr) || typeof (expr as { op?: unknown }).op !== 'string') {
    return undefined
  }
  const custom = getExprOp(expr.op)
  if (custom) {
    return custom(expr, ctx, (node) => evaluateExpr(node, ctx))
  }

  switch (expr.op) {
    case 'const':
      return expr.value
    case 'field':
      return ctx.rowValues?.[expr.fieldId]
    case 'add': {
      return expr.args.reduce((sum, arg) => sum + toNumber(evaluateExpr(arg, ctx)), 0)
    }
    case 'mul': {
      return expr.args.reduce((product, arg) => product * toNumber(evaluateExpr(arg, ctx)), 1)
    }
    case 'sub': {
      const pair = getBinaryOperands(expr as Record<string, unknown>)
      if (!pair) return Number.NaN
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return left - right
    }
    case 'div': {
      const pair = getBinaryOperands(expr as Record<string, unknown>)
      if (!pair) return Number.NaN
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return right === 0 ? Number.NaN : left / right
    }
    case 'eq': {
      const pair = getBinaryOperands(expr as Record<string, unknown>)
      if (!pair) return undefined
      return Object.is(evaluateExpr(pair.left, ctx), evaluateExpr(pair.right, ctx))
    }
    case 'neq': {
      const pair = getBinaryOperands(expr as Record<string, unknown>)
      if (!pair) return undefined
      return !Object.is(evaluateExpr(pair.left, ctx), evaluateExpr(pair.right, ctx))
    }
    case 'gt': {
      const pair = getBinaryOperands(expr as Record<string, unknown>)
      if (!pair) return false
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return !Number.isNaN(left) && !Number.isNaN(right) && left > right
    }
    case 'gte': {
      const pair = getBinaryOperands(expr as Record<string, unknown>)
      if (!pair) return false
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return !Number.isNaN(left) && !Number.isNaN(right) && left >= right
    }
    case 'lt': {
      const pair = getBinaryOperands(expr as Record<string, unknown>)
      if (!pair) return false
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return !Number.isNaN(left) && !Number.isNaN(right) && left < right
    }
    case 'lte': {
      const pair = getBinaryOperands(expr as Record<string, unknown>)
      if (!pair) return false
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return !Number.isNaN(left) && !Number.isNaN(right) && left <= right
    }
    case 'and':
      return expr.args.every((arg) => isTruthy(evaluateExpr(arg, ctx)))
    case 'or':
      return expr.args.some((arg) => isTruthy(evaluateExpr(arg, ctx)))
    case 'not':
      return !isTruthy(evaluateExpr(expr.arg, ctx))
    case 'if':
      return isTruthy(evaluateExpr(expr.cond, ctx))
        ? evaluateExpr(expr.then, ctx)
        : evaluateExpr(expr.else, ctx)
    case 'regex': {
      const value = evaluateExpr(expr.value, ctx)
      const str = value == null ? '' : String(value)
      try {
        const re = new RegExp(expr.pattern, expr.flags)
        return re.test(str)
      } catch {
        return false
      }
    }
    default:
      return undefined
  }
}
