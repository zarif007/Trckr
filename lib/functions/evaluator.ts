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
import type { ExprNode, FunctionContext } from "./types";
import { normalizeExprOp } from "./normalize";
import { getExprOp } from "./registry";

// ============================================================================
// Utility Functions
// ============================================================================

const toNumber = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value.trim() === "") return 0;
    return Number(value);
  }
  return Number.NaN;
};

const isTruthy = (value: unknown): boolean => Boolean(value);

const isExprNodeLike = (value: unknown): value is ExprNode =>
  value != null &&
  typeof value === "object" &&
  "op" in value &&
  typeof (value as { op?: unknown }).op === "string";

/** Variadic ops may be stored as { args } or { left, right }. */
function getVariadicOperands(expr: Record<string, unknown>): ExprNode[] | null {
  const args = expr.args;
  if (Array.isArray(args)) {
    return args as ExprNode[];
  }
  if (expr.left != null && expr.right != null) {
    return [expr.left as ExprNode, expr.right as ExprNode];
  }
  return null;
}

/** Binary ops may be stored as { left, right } or { args: [left, right] }. */
function getBinaryOperands(
  expr: Record<string, unknown>,
): { left: ExprNode; right: ExprNode } | null {
  if (expr.left != null && expr.right != null) {
    return { left: expr.left as ExprNode, right: expr.right as ExprNode };
  }
  const args = expr.args;
  if (
    Array.isArray(args) &&
    args.length >= 2 &&
    args[0] != null &&
    args[1] != null
  ) {
    return { left: args[0] as ExprNode, right: args[1] as ExprNode };
  }
  return null;
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
 * @returns The computed value (type follows the expression)
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
 * - `accumulate`: Reduce a table column (requires ctx.getColumnValues). startIndex/endIndex clamped;
 * increment defaults to 1; action add/mul/sub (sub: initialValue - v0 - v1 - ...).
 *
 * @example
 * ```ts
 * // Simple field lookup
 * evaluateExpr({ op: 'field', fieldId: 'price' }, { rowValues: { price: 50 } });
 * // Returns: 50
 *
 * // Arithmetic
 * evaluateExpr(
 * { op: 'mul', args: [
 * { op: 'field', fieldId: 'qty' },
 * { op: 'field', fieldId: 'price' }
 * ]},
 * { rowValues: { qty: 2, price: 50 } }
 * );
 * // Returns: 100
 * ```
 */
export function evaluateExpr(expr: ExprNode, ctx: FunctionContext): unknown {
  if (!isExprNodeLike(expr)) {
    return undefined;
  }
  const custom = getExprOp(expr.op);
  if (custom) {
    return custom(expr, ctx, (node) => evaluateExpr(node, ctx));
  }

  const normalizedOp = normalizeExprOp(expr.op);
  const normalizedExpr = (
    normalizedOp === expr.op ? expr : { ...expr, op: normalizedOp }
  ) as ExprNode;
  switch (normalizedExpr.op) {
    case "const":
      return normalizedExpr.value;
    case "field":
      return ctx.rowValues?.[normalizedExpr.fieldId];
    case "accumulate": {
      const acc = normalizedExpr as Extract<ExprNode, { op: "accumulate" }>;
      const getCol = ctx.getColumnValues;
      if (typeof getCol !== "function") {
        return acc.initialValue ?? (acc.action === "mul" ? 1 : 0);
      }
      const arr = getCol(acc.sourceFieldId);
      if (!Array.isArray(arr)) {
        return acc.initialValue ?? (acc.action === "mul" ? 1 : 0);
      }
      const len = arr.length;
      if (len === 0) {
        return acc.initialValue ?? (acc.action === "mul" ? 1 : 0);
      }
      const start = Math.max(0, Math.min(acc.startIndex ?? 0, len - 1));
      const end = Math.max(0, Math.min(acc.endIndex ?? len - 1, len - 1));
      const step =
        (acc.increment ?? 1) <= 0 ? 1 : Math.floor(acc.increment ?? 1);
      if (start > end) {
        return acc.initialValue ?? (acc.action === "mul" ? 1 : 0);
      }
      let result: number;
      if (acc.action === "add") {
        result = acc.initialValue ?? 0;
        for (let i = start; i <= end; i += step) {
          result += toNumber(arr[i]);
        }
      } else if (acc.action === "mul") {
        result = acc.initialValue ?? 1;
        for (let i = start; i <= end; i += step) {
          result *= toNumber(arr[i]);
        }
      } else {
        result = acc.initialValue ?? 0;
        for (let i = start; i <= end; i += step) {
          result -= toNumber(arr[i]);
        }
      }
      return result;
    }
    case "sum": {
      const sumNode = normalizedExpr as Extract<ExprNode, { op: "sum" }>;
      const getCol = ctx.getColumnValues;
      if (typeof getCol !== "function") {
        return sumNode.initialValue ?? 0;
      }
      const arr = getCol(sumNode.sourceFieldId);
      if (!Array.isArray(arr)) {
        return sumNode.initialValue ?? 0;
      }
      const len = arr.length;
      if (len === 0) {
        return sumNode.initialValue ?? 0;
      }
      const start = Math.max(0, Math.min(sumNode.startIndex ?? 0, len - 1));
      const end = Math.max(0, Math.min(sumNode.endIndex ?? len - 1, len - 1));
      const step =
        (sumNode.increment ?? 1) <= 0 ? 1 : Math.floor(sumNode.increment ?? 1);
      if (start > end) {
        return sumNode.initialValue ?? 0;
      }
      let sumResult = sumNode.initialValue ?? 0;
      for (let i = start; i <= end; i += step) {
        sumResult += toNumber(arr[i]);
      }
      return sumResult;
    }
    case "count": {
      const countNode = normalizedExpr as Extract<ExprNode, { op: "count" }>;
      const getCol = ctx.getColumnValues;
      if (typeof getCol !== "function") return 0;
      const arr = getCol(countNode.sourceFieldId);
      return Array.isArray(arr) ? arr.length : 0;
    }
    case "add": {
      const args = getVariadicOperands(
        normalizedExpr as Record<string, unknown>,
      );
      if (!args || args.length === 0) return Number.NaN;
      return args.reduce(
        (sum, arg) => sum + toNumber(evaluateExpr(arg, ctx)),
        0,
      );
    }
    case "mul": {
      const args = getVariadicOperands(
        normalizedExpr as Record<string, unknown>,
      );
      if (!args || args.length === 0) return Number.NaN;
      return args.reduce(
        (product, arg) => product * toNumber(evaluateExpr(arg, ctx)),
        1,
      );
    }
    case "sub": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return Number.NaN;
      const left = toNumber(evaluateExpr(pair.left, ctx));
      const right = toNumber(evaluateExpr(pair.right, ctx));
      return left - right;
    }
    case "div": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return Number.NaN;
      const left = toNumber(evaluateExpr(pair.left, ctx));
      const right = toNumber(evaluateExpr(pair.right, ctx));
      return right === 0 ? Number.NaN : left / right;
    }
    case "eq": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return undefined;
      return Object.is(
        evaluateExpr(pair.left, ctx),
        evaluateExpr(pair.right, ctx),
      );
    }
    case "neq": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return undefined;
      return !Object.is(
        evaluateExpr(pair.left, ctx),
        evaluateExpr(pair.right, ctx),
      );
    }
    case "gt": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return false;
      const left = toNumber(evaluateExpr(pair.left, ctx));
      const right = toNumber(evaluateExpr(pair.right, ctx));
      return !Number.isNaN(left) && !Number.isNaN(right) && left > right;
    }
    case "gte": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return false;
      const left = toNumber(evaluateExpr(pair.left, ctx));
      const right = toNumber(evaluateExpr(pair.right, ctx));
      return !Number.isNaN(left) && !Number.isNaN(right) && left >= right;
    }
    case "lt": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return false;
      const left = toNumber(evaluateExpr(pair.left, ctx));
      const right = toNumber(evaluateExpr(pair.right, ctx));
      return !Number.isNaN(left) && !Number.isNaN(right) && left < right;
    }
    case "lte": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return false;
      const left = toNumber(evaluateExpr(pair.left, ctx));
      const right = toNumber(evaluateExpr(pair.right, ctx));
      return !Number.isNaN(left) && !Number.isNaN(right) && left <= right;
    }
    case "and": {
      const args = getVariadicOperands(
        normalizedExpr as Record<string, unknown>,
      );
      if (!args || args.length === 0) return false;
      return args.every((arg) => isTruthy(evaluateExpr(arg, ctx)));
    }
    case "or": {
      const args = getVariadicOperands(
        normalizedExpr as Record<string, unknown>,
      );
      if (!args || args.length === 0) return false;
      return args.some((arg) => isTruthy(evaluateExpr(arg, ctx)));
    }
    case "not": {
      if (!isExprNodeLike(normalizedExpr.arg)) return undefined;
      return !isTruthy(evaluateExpr(normalizedExpr.arg, ctx));
    }
    case "if": {
      if (
        !isExprNodeLike(normalizedExpr.cond) ||
        !isExprNodeLike(normalizedExpr.then) ||
        !isExprNodeLike(normalizedExpr.else)
      ) {
        return undefined;
      }
      return isTruthy(evaluateExpr(normalizedExpr.cond, ctx))
        ? evaluateExpr(normalizedExpr.then, ctx)
        : evaluateExpr(normalizedExpr.else, ctx);
    }
    case "regex": {
      if (
        !isExprNodeLike(normalizedExpr.value) ||
        typeof normalizedExpr.pattern !== "string"
      )
        return false;
      const value = evaluateExpr(normalizedExpr.value, ctx);
      const str = value == null ? "" : String(value);
      try {
        const re = new RegExp(normalizedExpr.pattern, normalizedExpr.flags);
        return re.test(str);
      } catch {
        return false;
      }
    }
    // Math function ops
    case "abs": {
      if (!isExprNodeLike(normalizedExpr.arg)) return Number.NaN;
      return Math.abs(toNumber(evaluateExpr(normalizedExpr.arg, ctx)));
    }
    case "round": {
      if (!isExprNodeLike(normalizedExpr.arg)) return Number.NaN;
      return Math.round(toNumber(evaluateExpr(normalizedExpr.arg, ctx)));
    }
    case "floor": {
      if (!isExprNodeLike(normalizedExpr.arg)) return Number.NaN;
      return Math.floor(toNumber(evaluateExpr(normalizedExpr.arg, ctx)));
    }
    case "ceil": {
      if (!isExprNodeLike(normalizedExpr.arg)) return Number.NaN;
      return Math.ceil(toNumber(evaluateExpr(normalizedExpr.arg, ctx)));
    }
    case "mod": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return Number.NaN;
      const left = toNumber(evaluateExpr(pair.left, ctx));
      const right = toNumber(evaluateExpr(pair.right, ctx));
      return right === 0 ? Number.NaN : left % right;
    }
    case "pow": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return Number.NaN;
      const base = toNumber(evaluateExpr(pair.left, ctx));
      const exp = toNumber(evaluateExpr(pair.right, ctx));
      return Math.pow(base, exp);
    }
    case "min": {
      const args = getVariadicOperands(
        normalizedExpr as Record<string, unknown>,
      );
      if (!args || args.length === 0) return Number.NaN;
      return Math.min(...args.map((a) => toNumber(evaluateExpr(a, ctx))));
    }
    case "max": {
      const args = getVariadicOperands(
        normalizedExpr as Record<string, unknown>,
      );
      if (!args || args.length === 0) return Number.NaN;
      return Math.max(...args.map((a) => toNumber(evaluateExpr(a, ctx))));
    }
    case "clamp": {
      const clampNode = normalizedExpr as Extract<ExprNode, { op: "clamp" }>;
      if (
        !isExprNodeLike(clampNode.value) ||
        !isExprNodeLike(clampNode.min) ||
        !isExprNodeLike(clampNode.max)
      )
        return Number.NaN;
      const v = toNumber(evaluateExpr(clampNode.value, ctx));
      const lo = toNumber(evaluateExpr(clampNode.min, ctx));
      const hi = toNumber(evaluateExpr(clampNode.max, ctx));
      return Math.min(Math.max(v, lo), hi);
    }
    // String function ops
    case "length": {
      if (!isExprNodeLike(normalizedExpr.arg)) return 0;
      const s = evaluateExpr(normalizedExpr.arg, ctx);
      if (typeof s === "string") return s.length;
      if (Array.isArray(s)) return s.length;
      return s == null ? 0 : String(s).length;
    }
    case "trim": {
      if (!isExprNodeLike(normalizedExpr.arg)) return "";
      return String(evaluateExpr(normalizedExpr.arg, ctx) ?? "").trim();
    }
    case "toUpper": {
      if (!isExprNodeLike(normalizedExpr.arg)) return "";
      return String(evaluateExpr(normalizedExpr.arg, ctx) ?? "").toUpperCase();
    }
    case "toLower": {
      if (!isExprNodeLike(normalizedExpr.arg)) return "";
      return String(evaluateExpr(normalizedExpr.arg, ctx) ?? "").toLowerCase();
    }
    case "includes": {
      const pair = getBinaryOperands(normalizedExpr as Record<string, unknown>);
      if (!pair) return false;
      const haystack = String(evaluateExpr(pair.left, ctx) ?? "");
      const needle = String(evaluateExpr(pair.right, ctx) ?? "");
      return haystack.includes(needle);
    }
    case "concat": {
      const args = getVariadicOperands(
        normalizedExpr as Record<string, unknown>,
      );
      if (!args || args.length === 0) return "";
      return args.map((a) => String(evaluateExpr(a, ctx) ?? "")).join("");
    }
    case "slice": {
      const sliceNode = normalizedExpr as Extract<ExprNode, { op: "slice" }>;
      if (
        !isExprNodeLike(sliceNode.value) ||
        !isExprNodeLike(sliceNode.start) ||
        !isExprNodeLike(sliceNode.end)
      )
        return "";
      const str = String(evaluateExpr(sliceNode.value, ctx) ?? "");
      const start = toNumber(evaluateExpr(sliceNode.start, ctx));
      const end = toNumber(evaluateExpr(sliceNode.end, ctx));
      return str.slice(start, end);
    }
    default:
      return undefined;
  }
}
