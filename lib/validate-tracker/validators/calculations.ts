/**
 * Validates tracker.calculations. Keys must be "gridId.fieldId" (target path).
 * Calculation expressions must reference fields in the same grid as the target,
 * except `accumulate`: its sourceFieldId may reference another grid (e.g. sum of Amounts.amount).
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

function getVariadicArgs(node: Record<string, unknown>): unknown[] | null {
  const args = node.args
  if (Array.isArray(args) && args.length >= 1) return args
  const pair = getBinaryOperands(node)
  if (pair) return [pair.left, pair.right]
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
    case 'or':
    case 'min':
    case 'max':
    case 'concat': {
      const args = getVariadicArgs(normalizedNode as Record<string, unknown>) ?? []
      for (const arg of args) {
        if (isExprNode(arg)) collectExprFieldRefs(arg, out)
      }
      return out
    }
    case 'sub':
    case 'div':
    case 'mod':
    case 'pow':
    case 'includes':
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
    case 'abs':
    case 'round':
    case 'floor':
    case 'ceil':
    case 'length':
    case 'trim':
    case 'toUpper':
    case 'toLower':
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
    case 'clamp':
      if (isExprNode(normalizedNode.value)) collectExprFieldRefs(normalizedNode.value, out)
      if (isExprNode(normalizedNode.min)) collectExprFieldRefs(normalizedNode.min, out)
      if (isExprNode(normalizedNode.max)) collectExprFieldRefs(normalizedNode.max, out)
      return out
    case 'slice':
      if (isExprNode(normalizedNode.value)) collectExprFieldRefs(normalizedNode.value, out)
      if (isExprNode(normalizedNode.start)) collectExprFieldRefs(normalizedNode.start, out)
      if (isExprNode(normalizedNode.end)) collectExprFieldRefs(normalizedNode.end, out)
      return out
    case 'accumulate':
    case 'sum':
    case 'count':
      out.add((normalizedNode as { sourceFieldId: string }).sourceFieldId)
      return out
    default:
      return out
  }
}

export function validateCalculationExprNode(
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
    case 'accumulate': {
      // Cross-grid sourceFieldId is allowed for accumulate (e.g. Total amount = sum(Amounts.amount)).
      const acc = normalizedNode as {
        sourceFieldId: string
        startIndex?: number
        endIndex?: number
        increment?: number
        action: string
      }
      const ref = acc.sourceFieldId
      if (typeof ref !== 'string' || ref.trim().length === 0) {
        errors.push(`${path}.sourceFieldId must be a non-empty string`)
        return errors
      }
      if (!ref.includes('.')) {
        errors.push(`${path}.sourceFieldId must be "gridId.fieldId" (e.g. amounts_grid.amount), not bare fieldId`)
        return errors
      }
      const parsed = parsePath(ref)
      if (!parsed.gridId || !parsed.fieldId) {
        errors.push(`${path}.sourceFieldId "${ref}" is not a valid field path`)
        return errors
      }
      if (!ctx.fieldPaths.has(ref)) {
        errors.push(`${path}.sourceFieldId references missing field path "${ref}"`)
        return errors
      }
      if (acc.startIndex != null && !Number.isInteger(acc.startIndex)) {
        errors.push(`${path}.startIndex must be an integer when provided`)
      }
      if (acc.endIndex != null && !Number.isInteger(acc.endIndex)) {
        errors.push(`${path}.endIndex must be an integer when provided`)
      }
      if (acc.increment != null) {
        if (typeof acc.increment !== 'number' || !Number.isInteger(acc.increment) || acc.increment < 1) {
          errors.push(`${path}.increment must be a positive integer`)
        }
      }
      const validActions = ['add', 'sub', 'mul']
      if (!validActions.includes(acc.action)) {
        errors.push(`${path}.action must be one of: ${validActions.join(', ')}`)
      }
      return errors
    }
    case 'sum': {
      const sumNode = normalizedNode as {
        sourceFieldId: string
        startIndex?: number
        endIndex?: number
        increment?: number
        initialValue?: number
      }
      const ref = sumNode.sourceFieldId
      if (typeof ref !== 'string' || ref.trim().length === 0) {
        errors.push(`${path}.sourceFieldId must be a non-empty string`)
        return errors
      }
      if (!ref.includes('.')) {
        errors.push(`${path}.sourceFieldId must be "gridId.fieldId" (e.g. amounts_grid.amount), not bare fieldId`)
        return errors
      }
      const parsedSum = parsePath(ref)
      if (!parsedSum.gridId || !parsedSum.fieldId) {
        errors.push(`${path}.sourceFieldId "${ref}" is not a valid field path`)
        return errors
      }
      if (!ctx.fieldPaths.has(ref)) {
        errors.push(`${path}.sourceFieldId references missing field path "${ref}"`)
        return errors
      }
      if (sumNode.startIndex != null && !Number.isInteger(sumNode.startIndex)) {
        errors.push(`${path}.startIndex must be an integer when provided`)
      }
      if (sumNode.endIndex != null && !Number.isInteger(sumNode.endIndex)) {
        errors.push(`${path}.endIndex must be an integer when provided`)
      }
      if (sumNode.increment != null) {
        if (typeof sumNode.increment !== 'number' || !Number.isInteger(sumNode.increment) || sumNode.increment < 1) {
          errors.push(`${path}.increment must be a positive integer`)
        }
      }
      return errors
    }
    case 'count': {
      const countNode = normalizedNode as { sourceFieldId: string }
      const ref = countNode.sourceFieldId
      if (typeof ref !== 'string' || ref.trim().length === 0) {
        errors.push(`${path}.sourceFieldId must be a non-empty string`)
        return errors
      }
      if (!ref.includes('.')) {
        errors.push(`${path}.sourceFieldId must be "gridId.fieldId" (e.g. items_grid.id), not bare fieldId`)
        return errors
      }
      const parsedCount = parsePath(ref)
      if (!parsedCount.gridId || !parsedCount.fieldId) {
        errors.push(`${path}.sourceFieldId "${ref}" is not a valid field path`)
        return errors
      }
      if (!ctx.fieldPaths.has(ref)) {
        errors.push(`${path}.sourceFieldId references missing field path "${ref}"`)
        return errors
      }
      return errors
    }
    case 'add':
    case 'mul':
    case 'and':
    case 'or':
    case 'min':
    case 'max':
    case 'concat': {
      const args = getVariadicArgs(normalizedNode as Record<string, unknown>)
      if (!args || args.length === 0) {
        errors.push(`${path}.args must be a non-empty array`)
        return errors
      }
      args.forEach((arg, idx) => {
        if (!isExprNode(arg)) {
          errors.push(`${path}.args[${idx}] is not a valid expression node`)
          return
        }
        errors.push(...validateCalculationExprNode(arg, ctx, targetGridId, `${path}.args[${idx}]`))
      })
      return errors
    }
    case 'sub':
    case 'div':
    case 'mod':
    case 'pow':
    case 'includes':
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
        errors.push(...validateCalculationExprNode(pair.left, ctx, targetGridId, `${path}.left`))
      }
      if (!isExprNode(pair.right)) {
        errors.push(`${path}.right (or .args[1]) is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(pair.right, ctx, targetGridId, `${path}.right`))
      }
      return errors
    }
    case 'not':
    case 'abs':
    case 'round':
    case 'floor':
    case 'ceil':
    case 'length':
    case 'trim':
    case 'toUpper':
    case 'toLower': {
      if (!isExprNode(normalizedNode.arg)) {
        errors.push(`${path}.arg is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(normalizedNode.arg, ctx, targetGridId, `${path}.arg`))
      }
      return errors
    }
    case 'if': {
      if (!isExprNode(normalizedNode.cond)) {
        errors.push(`${path}.cond is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(normalizedNode.cond, ctx, targetGridId, `${path}.cond`))
      }
      if (!isExprNode(normalizedNode.then)) {
        errors.push(`${path}.then is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(normalizedNode.then, ctx, targetGridId, `${path}.then`))
      }
      if (!isExprNode(normalizedNode.else)) {
        errors.push(`${path}.else is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(normalizedNode.else, ctx, targetGridId, `${path}.else`))
      }
      return errors
    }
    case 'regex': {
      if (!isExprNode(normalizedNode.value)) {
        errors.push(`${path}.value is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(normalizedNode.value, ctx, targetGridId, `${path}.value`))
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
    case 'clamp': {
      const clamp = normalizedNode as Extract<ExprNode, { op: 'clamp' }>
      if (!isExprNode(clamp.value)) {
        errors.push(`${path}.value is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(clamp.value, ctx, targetGridId, `${path}.value`))
      }
      if (!isExprNode(clamp.min)) {
        errors.push(`${path}.min is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(clamp.min, ctx, targetGridId, `${path}.min`))
      }
      if (!isExprNode(clamp.max)) {
        errors.push(`${path}.max is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(clamp.max, ctx, targetGridId, `${path}.max`))
      }
      return errors
    }
    case 'slice': {
      const slice = normalizedNode as Extract<ExprNode, { op: 'slice' }>
      if (!isExprNode(slice.value)) {
        errors.push(`${path}.value is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(slice.value, ctx, targetGridId, `${path}.value`))
      }
      if (!isExprNode(slice.start)) {
        errors.push(`${path}.start is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(slice.start, ctx, targetGridId, `${path}.start`))
      }
      if (!isExprNode(slice.end)) {
        errors.push(`${path}.end is not a valid expression node`)
      } else {
        errors.push(...validateCalculationExprNode(slice.end, ctx, targetGridId, `${path}.end`))
      }
      return errors
    }
    default:
      errors.push(`${path}.op "${String((normalizedNode as { op?: string }).op)}" is not a supported operator`)
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

    if (typeof (rawRule as Record<string, unknown>)._intent === 'string') {
      continue
    }

    const rule = rawRule as FieldCalculationRule
    if (!isExprNode(rule.expr)) {
      errors.push(`calculations.${key}.expr must be a valid expression node`)
      continue
    }
    errors.push(...validateCalculationExprNode(rule.expr, ctx, gridId, `calculations.${key}.expr`))

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
