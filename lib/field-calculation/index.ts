import type { ExprNode, FieldCalculationRule, FunctionContext } from '@/lib/functions/types'
import { evaluateExpr } from '@/lib/functions/evaluator'
import { parsePath } from '@/lib/resolve-bindings'

export interface ApplyCalculationsForRowInput {
  gridId: string
  row: Record<string, unknown>
  calculations?: Record<string, FieldCalculationRule>
  changedFieldIds?: string[]
}

export interface ApplyCalculationsForRowResult {
  row: Record<string, unknown>
  updatedFieldIds: string[]
  skippedCyclicTargets: string[]
}

export interface CompiledCalculationPlan {
  gridId: string
  rulesByTargetFieldId: Map<string, FieldCalculationRule>
  dependsOnTargets: Map<string, Set<string>>
  reverseDeps: Map<string, Set<string>>
}

export interface ApplyCompiledCalculationsForRowInput {
  plan: CompiledCalculationPlan
  row: Record<string, unknown>
  changedFieldIds?: string[]
}

const isExprNode = (value: unknown): value is ExprNode =>
  value != null &&
  typeof value === 'object' &&
  'op' in value &&
  typeof (value as { op?: unknown }).op === 'string'

function normalizeRefFieldId(ref: string, targetGridId: string): string | null {
  if (typeof ref !== 'string' || ref.trim() === '') return null
  if (!ref.includes('.')) return ref
  const { gridId, fieldId } = parsePath(ref)
  if (!gridId || !fieldId) return null
  if (gridId !== targetGridId) return null
  return fieldId
}

export function extractExprFieldRefs(expr: ExprNode, out = new Set<string>()): Set<string> {
  if (!isExprNode(expr)) return out
  switch (expr.op) {
    case 'field':
      out.add(expr.fieldId)
      return out
    case 'const':
      return out
    case 'add':
    case 'mul':
    case 'and':
    case 'or':
      for (const arg of expr.args ?? []) {
        if (isExprNode(arg)) extractExprFieldRefs(arg, out)
      }
      return out
    case 'sub':
    case 'div':
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      if (isExprNode((expr as { left?: ExprNode }).left)) extractExprFieldRefs(expr.left, out)
      if (isExprNode((expr as { right?: ExprNode }).right)) extractExprFieldRefs(expr.right, out)
      if (Array.isArray((expr as { args?: ExprNode[] }).args)) {
        const args = (expr as { args?: ExprNode[] }).args ?? []
        if (isExprNode(args[0])) extractExprFieldRefs(args[0], out)
        if (isExprNode(args[1])) extractExprFieldRefs(args[1], out)
      }
      return out
    case 'not':
      if (isExprNode(expr.arg)) extractExprFieldRefs(expr.arg, out)
      return out
    case 'if':
      if (isExprNode(expr.cond)) extractExprFieldRefs(expr.cond, out)
      if (isExprNode(expr.then)) extractExprFieldRefs(expr.then, out)
      if (isExprNode(expr.else)) extractExprFieldRefs(expr.else, out)
      return out
    case 'regex':
      if (isExprNode(expr.value)) extractExprFieldRefs(expr.value, out)
      return out
    default:
      return out
  }
}

function toGridTargetRules(
  gridId: string,
  calculations?: Record<string, FieldCalculationRule>,
): Map<string, FieldCalculationRule> {
  const rules = new Map<string, FieldCalculationRule>()
  if (!calculations) return rules
  for (const [path, rule] of Object.entries(calculations)) {
    if (!rule || !isExprNode(rule.expr)) continue
    const parsed = parsePath(path)
    if (parsed.gridId !== gridId || !parsed.fieldId) continue
    rules.set(parsed.fieldId, rule)
  }
  return rules
}

function buildRowValuesForEval(
  row: Record<string, unknown>,
  gridId: string,
): Record<string, unknown> {
  const rowValues = { ...row }
  for (const [fieldId, value] of Object.entries(row)) {
    rowValues[`${gridId}.${fieldId}`] = value
  }
  return rowValues
}

function buildDependencyGraph(
  gridId: string,
  rulesByTargetFieldId: Map<string, FieldCalculationRule>,
): {
  dependsOnTargets: Map<string, Set<string>>
  reverseDeps: Map<string, Set<string>>
} {
  const dependsOnTargets = new Map<string, Set<string>>()
  const reverseDeps = new Map<string, Set<string>>()
  const targetFieldIds = new Set(rulesByTargetFieldId.keys())

  for (const [targetFieldId, rule] of rulesByTargetFieldId.entries()) {
    const refs = extractExprFieldRefs(rule.expr)
    const deps = new Set<string>()
    for (const ref of refs) {
      const normalized = normalizeRefFieldId(ref, gridId)
      if (!normalized) continue

      const reverse = reverseDeps.get(normalized) ?? new Set<string>()
      reverse.add(targetFieldId)
      reverseDeps.set(normalized, reverse)

      if (targetFieldIds.has(normalized)) {
        deps.add(normalized)
      }
    }
    dependsOnTargets.set(targetFieldId, deps)
  }

  return { dependsOnTargets, reverseDeps }
}

function normalizeChangedFieldIds(
  changedFieldIds: string[] | undefined,
  gridId: string,
): string[] | undefined {
  if (!changedFieldIds || changedFieldIds.length === 0) return undefined
  const normalized = new Set<string>()
  for (const fieldId of changedFieldIds) {
    const fromPath = normalizeRefFieldId(fieldId, gridId)
    normalized.add(fromPath ?? fieldId)
  }
  return Array.from(normalized)
}

function getImpactedTargets(
  rulesByTargetFieldId: Map<string, FieldCalculationRule>,
  reverseDeps: Map<string, Set<string>>,
  changedFieldIds: string[] | undefined,
): Set<string> {
  const impacted = new Set<string>()
  if (!changedFieldIds || changedFieldIds.length === 0) {
    for (const targetFieldId of rulesByTargetFieldId.keys()) impacted.add(targetFieldId)
    return impacted
  }

  const queue: string[] = []
  for (const fieldId of changedFieldIds) {
    if (rulesByTargetFieldId.has(fieldId)) {
      impacted.add(fieldId)
      queue.push(fieldId)
    }
    for (const target of reverseDeps.get(fieldId) ?? []) {
      if (!impacted.has(target)) {
        impacted.add(target)
        queue.push(target)
      }
    }
  }

  while (queue.length > 0) {
    const source = queue.shift()!
    for (const target of reverseDeps.get(source) ?? []) {
      if (impacted.has(target)) continue
      impacted.add(target)
      queue.push(target)
    }
  }

  return impacted
}

function resolveEvaluationOrder(
  dependsOnTargets: Map<string, Set<string>>,
  impactedTargets: Set<string>,
): { order: string[]; cyclicTargets: Set<string> } {
  const order: string[] = []
  const cyclicTargets = new Set<string>()
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const stack: string[] = []

  const dfs = (target: string) => {
    if (visited.has(target)) return
    if (visiting.has(target)) {
      const cycleStart = stack.indexOf(target)
      if (cycleStart >= 0) {
        for (const cycleNode of stack.slice(cycleStart)) cyclicTargets.add(cycleNode)
      } else {
        cyclicTargets.add(target)
      }
      return
    }

    visiting.add(target)
    stack.push(target)

    for (const dep of dependsOnTargets.get(target) ?? []) {
      if (!impactedTargets.has(dep)) continue
      dfs(dep)
    }

    stack.pop()
    visiting.delete(target)
    visited.add(target)
    if (!cyclicTargets.has(target)) order.push(target)
  }

  for (const target of impactedTargets) dfs(target)

  return { order, cyclicTargets }
}

function evaluateTarget(
  plan: CompiledCalculationPlan,
  rowValues: Record<string, unknown>,
  targetFieldId: string,
): unknown {
  const rule = plan.rulesByTargetFieldId.get(targetFieldId)
  if (!rule) return undefined
  const ctx: FunctionContext = {
    rowValues,
    fieldId: `${plan.gridId}.${targetFieldId}`,
  }
  return evaluateExpr(rule.expr, ctx)
}

const compiledPlanCache = new WeakMap<
  Record<string, FieldCalculationRule>,
  Map<string, CompiledCalculationPlan>
>()

export function compileCalculationsForGrid(
  gridId: string,
  calculations?: Record<string, FieldCalculationRule>,
): CompiledCalculationPlan {
  const rulesByTargetFieldId = toGridTargetRules(gridId, calculations)
  const { dependsOnTargets, reverseDeps } = buildDependencyGraph(gridId, rulesByTargetFieldId)
  return {
    gridId,
    rulesByTargetFieldId,
    dependsOnTargets,
    reverseDeps,
  }
}

function getCachedCompiledPlan(
  gridId: string,
  calculations?: Record<string, FieldCalculationRule>,
): CompiledCalculationPlan {
  if (!calculations) return compileCalculationsForGrid(gridId, calculations)
  const byGrid = compiledPlanCache.get(calculations)
  const cached = byGrid?.get(gridId)
  if (cached) return cached
  const compiled = compileCalculationsForGrid(gridId, calculations)
  if (byGrid) {
    byGrid.set(gridId, compiled)
  } else {
    compiledPlanCache.set(calculations, new Map<string, CompiledCalculationPlan>([[gridId, compiled]]))
  }
  return compiled
}

export function applyCompiledCalculationsForRow({
  plan,
  row,
  changedFieldIds,
}: ApplyCompiledCalculationsForRowInput): ApplyCalculationsForRowResult {
  if (plan.rulesByTargetFieldId.size === 0) {
    return { row, updatedFieldIds: [], skippedCyclicTargets: [] }
  }

  const normalizedChangedFieldIds = normalizeChangedFieldIds(changedFieldIds, plan.gridId)
  const impactedTargets = getImpactedTargets(
    plan.rulesByTargetFieldId,
    plan.reverseDeps,
    normalizedChangedFieldIds,
  )
  if (impactedTargets.size === 0) {
    return { row, updatedFieldIds: [], skippedCyclicTargets: [] }
  }

  const { order, cyclicTargets } = resolveEvaluationOrder(plan.dependsOnTargets, impactedTargets)
  const nextRow = { ...row }
  const rowValues = buildRowValuesForEval(nextRow, plan.gridId)
  const updatedFieldIds: string[] = []

  for (const targetFieldId of order) {
    const nextValue = evaluateTarget(plan, rowValues, targetFieldId)
    if (!Object.is(nextRow[targetFieldId], nextValue)) {
      nextRow[targetFieldId] = nextValue
      rowValues[targetFieldId] = nextValue
      rowValues[`${plan.gridId}.${targetFieldId}`] = nextValue
      updatedFieldIds.push(targetFieldId)
    }
  }

  return {
    row: updatedFieldIds.length > 0 ? nextRow : row,
    updatedFieldIds,
    skippedCyclicTargets: Array.from(cyclicTargets),
  }
}

export function applyCalculationsForRow({
  gridId,
  row,
  calculations,
  changedFieldIds,
}: ApplyCalculationsForRowInput): ApplyCalculationsForRowResult {
  const plan = getCachedCompiledPlan(gridId, calculations)
  return applyCompiledCalculationsForRow({
    plan,
    row,
    changedFieldIds,
  })
}
