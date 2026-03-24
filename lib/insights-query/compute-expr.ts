import type { FormatterComputeExpression, FormatterValueRef } from './schemas'

export function getAtPath(row: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = row
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined
    if (typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function toNumeric(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function resolveValueRef(row: Record<string, unknown>, ref: FormatterValueRef): number | null {
  if ('num' in ref) return Number.isFinite(ref.num) ? ref.num : null
  return toNumeric(getAtPath(row, ref.path))
}

/** Evaluate a row-level numeric expression (shared by query aggregates and formatter). */
export function evalComputeExpression(
  row: Record<string, unknown>,
  expr: FormatterComputeExpression,
): number | null {
  switch (expr.kind) {
    case 'binary': {
      const a = resolveValueRef(row, expr.left)
      const b = resolveValueRef(row, expr.right)
      if (a === null || b === null) return null
      switch (expr.fn) {
        case 'add':
          return a + b
        case 'subtract':
          return a - b
        case 'multiply':
          return a * b
        case 'divide':
          return b === 0 ? null : a / b
        default:
          return null
      }
    }
    case 'unary': {
      const x = resolveValueRef(row, expr.of)
      if (x === null) return null
      const d = expr.decimals ?? 2
      switch (expr.fn) {
        case 'abs':
          return Math.abs(x)
        case 'neg':
          return -x
        case 'ceil':
          return Math.ceil(x)
        case 'floor':
          return Math.floor(x)
        case 'round': {
          const p = 10 ** d
          return Math.round(x * p) / p
        }
        default:
          return null
      }
    }
    case 'percent': {
      const part = resolveValueRef(row, expr.part)
      const whole = resolveValueRef(row, expr.whole)
      if (part === null || whole === null || whole === 0) return null
      const scale = expr.scale ?? 100
      return (part / whole) * scale
    }
    default:
      return null
  }
}
