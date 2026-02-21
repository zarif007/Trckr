import type { ExprNode, FunctionContext } from './types'
import { normalizeExprOp } from './normalize'
import { getExprOp } from './registry'

const toNumber = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    if (value.trim() === '') return 0
    return Number(value)
  }
  return Number.NaN
}

const isTruthy = (value: unknown): boolean => Boolean(value)

const isExprNodeLike = (value: unknown): value is ExprNode =>
  value != null &&
  typeof value === 'object' &&
  'op' in value &&
  typeof (value as { op?: unknown }).op === 'string'

/** Variadic ops may be stored as { args } or { left, right }. */
function getVariadicOperands(expr: Record<string, unknown>): ExprNode[] | null {
  const args = expr.args
  if (Array.isArray(args)) {
    return args as ExprNode[]
  }
  if (expr.left != null && expr.right != null) {
    return [expr.left as ExprNode, expr.right as ExprNode]
  }
  return null
}

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
  if (!isExprNodeLike(expr)) {
    return undefined
  }
  const custom = getExprOp(expr.op)
  if (custom) {
    return custom(expr, ctx, (node) => evaluateExpr(node, ctx))
  }

  const normalizedOp = normalizeExprOp(expr.op)
  const normalizedExpr = (normalizedOp === expr.op ? expr : { ...expr, op: normalizedOp }) as ExprNode
  switch (normalizedExpr.op) {
    case 'const':
      return normalizedExpr.value
    case 'field':
      return ctx.rowValues?.[normalizedExpr.fieldId]
    case 'add': {
      const args = getVariadicOperands(normalizedExpr as Record<string, unknown>)
      if (!args || args.length === 0) return Number.NaN
      return args.reduce((sum, arg) => sum + toNumber(evaluateExpr(arg, ctx)), 0)
    }
    case 'mul': {
      const args = getVariadicOperands(normalizedExpr as Record<string, unknown>)
      if (!args || args.length === 0) return Number.NaN
      return args.reduce((product, arg) => product * toNumber(evaluateExpr(arg, ctx)), 1)
    }
    case 'sub': {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>)
      if (!pair) return Number.NaN
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return left - right
    }
    case 'div': {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>)
      if (!pair) return Number.NaN
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return right === 0 ? Number.NaN : left / right
    }
    case 'eq': {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>)
      if (!pair) return undefined
      return Object.is(evaluateExpr(pair.left, ctx), evaluateExpr(pair.right, ctx))
    }
    case 'neq': {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>)
      if (!pair) return undefined
      return !Object.is(evaluateExpr(pair.left, ctx), evaluateExpr(pair.right, ctx))
    }
    case 'gt': {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>)
      if (!pair) return false
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return !Number.isNaN(left) && !Number.isNaN(right) && left > right
    }
    case 'gte': {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>)
      if (!pair) return false
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return !Number.isNaN(left) && !Number.isNaN(right) && left >= right
    }
    case 'lt': {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>)
      if (!pair) return false
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return !Number.isNaN(left) && !Number.isNaN(right) && left < right
    }
    case 'lte': {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>)
      if (!pair) return false
      const left = toNumber(evaluateExpr(pair.left, ctx))
      const right = toNumber(evaluateExpr(pair.right, ctx))
      return !Number.isNaN(left) && !Number.isNaN(right) && left <= right
    }
    case 'and': {
      const args = getVariadicOperands(normalizedExpr as Record<string, unknown>)
      if (!args || args.length === 0) return false
      return args.every((arg) => isTruthy(evaluateExpr(arg, ctx)))
    }
    case 'or': {
      const args = getVariadicOperands(normalizedExpr as Record<string, unknown>)
      if (!args || args.length === 0) return false
      return args.some((arg) => isTruthy(evaluateExpr(arg, ctx)))
    }
    case 'not': {
      if (!isExprNodeLike(normalizedExpr.arg)) return undefined
      return !isTruthy(evaluateExpr(normalizedExpr.arg, ctx))
    }
    case 'if': {
      if (
        !isExprNodeLike(normalizedExpr.cond) ||
        !isExprNodeLike(normalizedExpr.then) ||
        !isExprNodeLike(normalizedExpr.else)
      ) {
        return undefined
      }
      return isTruthy(evaluateExpr(normalizedExpr.cond, ctx))
        ? evaluateExpr(normalizedExpr.then, ctx)
        : evaluateExpr(normalizedExpr.else, ctx)
    }
    case 'regex': {
      if (!isExprNodeLike(normalizedExpr.value) || typeof normalizedExpr.pattern !== 'string') return false
      const value = evaluateExpr(normalizedExpr.value, ctx)
      const str = value == null ? '' : String(value)
      try {
        const re = new RegExp(normalizedExpr.pattern, normalizedExpr.flags)
        return re.test(str)
      } catch {
        return false
      }
    }
    default:
      return undefined
  }
}
