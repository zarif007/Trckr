/**
 * Validates tracker.calculations. Keys must be "gridId.fieldId" (target path).
 * Calculation expressions must reference fields in the same grid as the target.
 */
import type { ValidationContext, ValidatorResult } from '../types'
import type { ExprNode, FieldCalculationRule } from '@/lib/functions/types'
import { normalizeExprOp } from '@/lib/functions/normalize'
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

function collectExprFieldRefs(node: ExprNode, out = new Set<string>()): Set<string> {
  const normalizedOp = normalizeExprOp(node.op)
  const normalizedNode = (normalizedOp === node.op ? node : { ...node, op: normalizedOp }) as ExprNode

  switch (normalizedNode.op) {
    case 'field':
      out.add(normalizedNode.fieldId)
      return out
    case 'const':
      return out
    case 'add':
    case 'mul':
    case 'and':
    case 'or': {
      for (const arg of normalizedNode.args ?? []) {
        if (isExprNode(arg)) collectExprFieldRefs(arg, out)
      }
      return out
    }
    case 'sub':
    case 'div':
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const pair = getBinaryOperands(normalizedNode as Record<string, unknown>)
      if (!pair) return out
      if (isExprNode(pair.left)) collectExprFieldRefs(pair.left, out)
      if (isExprNode(pair.right)) collectExprFieldRefs(pair.right, out)
      return out
    }
    case 'not':
      if (isExprNode(normalizedNode.arg)) collectExprFieldRefs(normalizedNode.arg, out)
      return out
    case 'if':
      if (isExprNode(normalizedNode.cond)) collectExprFieldRefs(normalizedNode.cond, out)
      if (isExprNode(normalizedNode.then)) collectExprFieldRefs(normalizedNode.then, out)
      if (isExprNode(normalizedNode.else)) collectExprFieldRefs(normalizedNode.else, out)
      return out
    case 'regex':
      if (isExprNode(normalizedNode.value)) collectExprFieldRefs(normalizedNode.value, out)
      return out
    default:
      return out
  }
}

function validateExprNode(
  node: ExprNode,
  ctx: ValidationContext,
  targetGridId: string,
  path: string,
): string[] {
  const errors: string[] = []
  const normalizedOp = normalizeExprOp(node.op)
  const normalizedNode = (normalizedOp === node.op ? node : { ...node, op: normalizedOp }) as ExprNode

  switch (normalizedNode.op) {
    case 'const':
      return errors
    case 'field': {
      const ref = normalizedNode.fieldId
      if (typeof ref !== 'string' || ref.trim().length === 0) {
        errors.push(`${path}.fieldId must be a non-empty string`)
        return errors
      }
      if (!ref.includes('.')) {
        errors.push(`${path}.fieldId must be "gridId.fieldId" (e.g. main_grid.rate), not bare fieldId`)
        return errors
      }
      const parsed = parsePath(ref)
      if (!parsed.gridId || !parsed.fieldId) {
        errors.push(`${path}.fieldId "${ref}" is not a valid field path`)
        return errors
      }
      if (!ctx.fieldPaths.has(ref)) {
        errors.push(`${path}.fieldId references missing field path "${ref}"`)
        return errors
      }
      if (parsed.gridId !== targetGridId) {
        errors.push(`${path}.fieldId "${ref}" must stay within target grid "${targetGridId}"`)
      }
      return errors
    }
    case 'add':
    case 'mul':
    case 'and':
    case 'or': {
      const args = normalizedNode.args
      if (!Array.isArray(args) || args.length === 0) {
        errors.push(`${path}.args must be a non-empty array`)
        return errors
      }
      args.forEach((arg, idx) => {
        if (!isExprNode(arg)) {
          errors.push(`${path}.args[${idx}] is not a valid expression node`)
          return
        }
        errors.push(...validateExprNode(arg, ctx, targetGridId, `${path}.args[${idx}]`))
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
      const pair = getBinaryOperands(normalizedNode as Record<string, unknown>)
      if (!pair) {
        errors.push(`${path} must have .left and .right, or .args with two expression nodes`)
        return errors
      }
      if (!isExprNode(pair.left)) {
        errors.push(`${path}.left (or .args[0]) is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(pair.left, ctx, targetGridId, `${path}.left`))
      }
      if (!isExprNode(pair.right)) {
        errors.push(`${path}.right (or .args[1]) is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(pair.right, ctx, targetGridId, `${path}.right`))
      }
      return errors
    }
    case 'not': {
      if (!isExprNode(normalizedNode.arg)) {
        errors.push(`${path}.arg is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(normalizedNode.arg, ctx, targetGridId, `${path}.arg`))
      }
      return errors
    }
    case 'if': {
      if (!isExprNode(normalizedNode.cond)) {
        errors.push(`${path}.cond is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(normalizedNode.cond, ctx, targetGridId, `${path}.cond`))
      }
      if (!isExprNode(normalizedNode.then)) {
        errors.push(`${path}.then is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(normalizedNode.then, ctx, targetGridId, `${path}.then`))
      }
      if (!isExprNode(normalizedNode.else)) {
        errors.push(`${path}.else is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(normalizedNode.else, ctx, targetGridId, `${path}.else`))
      }
      return errors
    }
    case 'regex': {
      if (!isExprNode(normalizedNode.value)) {
        errors.push(`${path}.value is not a valid expression node`)
      } else {
        errors.push(...validateExprNode(normalizedNode.value, ctx, targetGridId, `${path}.value`))
      }
      if (typeof normalizedNode.pattern !== 'string') {
        errors.push(`${path}.pattern must be a string`)
      } else {
        try {
          new RegExp(normalizedNode.pattern, normalizedNode.flags)
        } catch {
          errors.push(`${path}.pattern is not a valid regex`)
        }
      }
      if (normalizedNode.flags != null && typeof normalizedNode.flags !== 'string') {
        errors.push(`${path}.flags must be a string when provided`)
      }
      return errors
    }
    default:
      errors.push(`${path}.op is not a supported operator`)
      return errors
  }
}

/** Parse calculation key; only "gridId.fieldId" is allowed. */
function getCalculationKeyPath(key: string): { gridId: string; fieldId: string } | null {
  if (!key.includes('.')) return null
  const { gridId, fieldId } = parsePath(key)
  return gridId && fieldId ? { gridId, fieldId } : null
}

function detectCycles(graph: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const stack: string[] = []

  const dfs = (node: string) => {
    if (visiting.has(node)) {
      const idx = stack.indexOf(node)
      if (idx >= 0) cycles.push([...stack.slice(idx), node])
      return
    }
    if (visited.has(node)) return
    visiting.add(node)
    stack.push(node)
    for (const dep of graph.get(node) ?? []) {
      dfs(dep)
    }
    stack.pop()
    visiting.delete(node)
    visited.add(node)
  }

  for (const node of graph.keys()) dfs(node)
  return cycles
}

export function validateCalculations(ctx: ValidationContext): ValidatorResult {
  const errors: string[] = []
  const calculations = ctx.calculations ?? {}
  const targetDeps = new Map<string, Set<string>>()
  const calculationKeys = new Set(Object.keys(calculations))

  for (const [key, rawRule] of Object.entries(calculations)) {
    const parsedKey = getCalculationKeyPath(key)
    if (!parsedKey) {
      errors.push(`calculations key "${key}" must be "gridId.fieldId" (e.g. main_grid.amount), like bindings`)
      continue
    }
    const { gridId } = parsedKey
    if (!ctx.gridIds.has(gridId)) {
      errors.push(`calculations key "${key}": grid "${gridId}" not found`)
      continue
    }
    if (!ctx.fieldPaths.has(key)) {
      errors.push(`calculations key "${key}": field path "${key}" not found (field must be placed in layout for that grid)`)
      continue
    }
    if (!isRecord(rawRule)) {
      errors.push(`calculations.${key} must be an object`)
      continue
    }

    const rule = rawRule as FieldCalculationRule
    if (!isExprNode(rule.expr)) {
      errors.push(`calculations.${key}.expr must be a valid expression node`)
      continue
    }
    errors.push(...validateExprNode(rule.expr, ctx, gridId, `calculations.${key}.expr`))

    const refs = collectExprFieldRefs(rule.expr)
    const deps = new Set<string>()
    for (const ref of refs) {
      if (ref === key) {
        errors.push(`calculations.${key}.expr must not reference itself`)
      }
      if (calculationKeys.has(ref)) deps.add(ref)
    }
    targetDeps.set(key, deps)
  }

  const cycles = detectCycles(targetDeps)
  for (const cycle of cycles) {
    const uniqueCycle = cycle.slice(0, -1)
    if (uniqueCycle.length > 0) {
      errors.push(`calculations contain a dependency cycle: ${uniqueCycle.join(' -> ')}`)
    }
  }

  return errors.length > 0 ? { errors } : {}
}

