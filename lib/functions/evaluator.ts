/**
 * Expression Evaluator
 * 
 * Safe, efficient evaluation of expression ASTs. Supports:
 * - Arithmetic: add, sub, mul, div
 * - Comparison: eq, neq, gt, gte, lt, lte
 * - Logic: and, or, not, if
 * - Field references and constants
 * - Regex pattern matching
 * - Extensible via custom operator registry
 * 
 * @module functions/evaluator
 * 
 * Security:
 * - No string evaluation or code execution
 * - Unknown operators return undefined (fail-safe)
 * - All operations are side-effect free
 * 
 * Performance:
 * - Direct switch dispatch (no dynamic lookup overhead)
 * - Lazy evaluation for and/or short-circuiting
 * - Normalized operator handling for variant shapes
 * 
 * @example
 * ```ts
 * const expr = { op: 'add', args: [{ op: 'field', fieldId: 'price' }, { op: 'const', value: 10 }] };
 * const result = evaluateExpr(expr, { rowValues: { price: 100 } });
 * // result === 110
 * ```
 */
import type { ExprNode, FunctionContext } from './types'
import { normalizeExprOp } from './normalize'
import { getExprOp } from './registry'

// ============================================================================
// Utility Functions
// ============================================================================

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

// ============================================================================
// Main Evaluator
// ============================================================================

/**
 * Evaluate an expression AST against a context.
 * 
 * The evaluator uses direct switch dispatch for performance and supports
 * extensible operators via the registry. Unknown operators return undefined.
 * 
 * @param expr - Expression AST node to evaluate
 * @param ctx - Evaluation context containing row values and field metadata
 * @returns The computed value (type depends on expression)
 * 
 * Supported operators:
 * - `const`: Return literal value
 * - `field`: Look up field value from rowValues
 * - `add`, `mul`: Variadic arithmetic (args array or left/right)
 * - `sub`, `div`: Binary arithmetic
 * - `eq`, `neq`, `gt`, `gte`, `lt`, `lte`: Comparisons
 * - `and`, `or`, `not`: Boolean logic with short-circuit
 * - `if`: Conditional (cond ? then : else)
 * - `regex`: Pattern matching
 * 
 * @example
 * ```ts
 * // Simple field lookup
 * evaluateExpr({ op: 'field', fieldId: 'price' }, { rowValues: { price: 50 } });
 * // Returns: 50
 * 
 * // Arithmetic
 * evaluateExpr(
 *   { op: 'mul', args: [
 *     { op: 'field', fieldId: 'qty' },
 *     { op: 'field', fieldId: 'price' }
 *   ]},
 *   { rowValues: { qty: 2, price: 50 } }
 * );
 * // Returns: 100
 * ```
 */
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
