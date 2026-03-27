/**
 * Field Calculation Engine
 * 
 * High-performance reactive calculation system for tracker fields. Provides:
 * - Compiled calculation plans with dependency graphs for efficient evaluation order
 * - LRU caching of compiled plans to avoid recompilation overhead
 * - Incremental evaluation (only affected targets are recalculated)
 * - Cycle detection to prevent infinite loops
 * - Expression result caching for repeated evaluations
 * - Cross-grid references via `accumulate` (sum/reduce table columns); pass `gridData` when such rules exist.
 *
 * @module field-calculation
 * 
 * Performance characteristics:
 * - Plan compilation: O(n) where n = number of calculation rules
 * - Dependency resolution: O(m) where m = number of field references
 * - Evaluation: O(k) where k = impacted targets (usually << total rules)
 * - Cache hit: O(1) lookup
 * 
 * @example
 * ```ts
 * // Apply calculations when a field changes
 * const result = applyCalculationsForRow({
 *   gridId: 'invoice_grid',
 *   row: { price: 100, qty: 2 },
 *   calculations: {
 *     'invoice_grid.total': { expr: { op: 'mul', args: [{ op: 'field', fieldId: 'price' }, { op: 'field', fieldId: 'qty' }] } }
 *   },
 *   changedFieldIds: ['price']
 * });
 * // result.row.total === 200
 * ```
 */
import type { ExprNode, FieldCalculationRule, FunctionContext } from '@/lib/functions/types'
import { evaluateExpr } from '@/lib/functions/evaluator'
import { parsePath } from '@/lib/resolve-bindings'

// ============================================================================
// Types
// ============================================================================

/** Input for applying calculations to a single row */
export interface ApplyCalculationsForRowInput {
  /** Grid identifier containing the row */
  gridId: string
  /** Row data with field values keyed by fieldId */
  row: Record<string, unknown>
  /** Calculation rules keyed by "gridId.fieldId" target path */
  calculations?: Record<string, FieldCalculationRule>
  /** Optional: only recalculate fields dependent on these changed fields */
  changedFieldIds?: string[]
  /**
   * Optional. When present, used to resolve table columns for `accumulate` expressions.
   * Required for correct evaluation of rules that reference other grids (e.g. sum of Amounts.amount).
   */
  gridData?: Record<string, Array<Record<string, unknown>>>
}

/** Result of applying calculations */
export interface ApplyCalculationsForRowResult {
  /** Updated row (same reference if no changes) */
  row: Record<string, unknown>
  /** Field IDs that were updated during this calculation pass */
  updatedFieldIds: string[]
  /** Field IDs skipped due to cyclic dependencies */
  skippedCyclicTargets: string[]
}

/**
 * Pre-compiled calculation plan for a grid.
 * Contains resolved dependency graph for efficient incremental evaluation.
 */
export interface CompiledCalculationPlan {
  /** Grid this plan applies to */
  gridId: string
  /** Rules indexed by target field ID (without grid prefix) */
  rulesByTargetFieldId: Map<string, FieldCalculationRule>
  /** Forward deps: target -> set of source field ids that feed this target */
  sourceFieldsByTarget: Map<string, Set<string>>
  /** Reverse deps: source field id -> set of calculation targets that use it */
  reverseDeps: Map<string, Set<string>>
  /** Timestamp when plan was compiled (for cache diagnostics) */
  compiledAt: number
  /** Hash of calculation rules for cache validation */
  rulesHash: string
}

/** Input for compiled calculation application */
export interface ApplyCompiledCalculationsForRowInput {
  /** Pre-compiled calculation plan */
  plan: CompiledCalculationPlan
  /** Row data to evaluate against */
  row: Record<string, unknown>
  /** Optional: only recalculate impacted fields */
  changedFieldIds?: string[]
  /**
   * Optional. Pass when any rule uses `accumulate` over another grid; enables getColumnValues in context.
   */
  gridData?: Record<string, Array<Record<string, unknown>>>
}

// ============================================================================
// Cache Configuration
// ============================================================================

/** Maximum number of compiled plans to cache per calculations object */
const COMPILED_PLAN_CACHE_MAX_SIZE = 100

/** Cache statistics for monitoring */
export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
}

const cacheStats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 }

/** Get current cache statistics (for debugging/monitoring) */
export function getCalculationCacheStats(): Readonly<CacheStats> {
  return { ...cacheStats }
}

/** Reset cache statistics */
export function resetCalculationCacheStats(): void {
  cacheStats.hits = 0
  cacheStats.misses = 0
  cacheStats.evictions = 0
}

// ============================================================================
// Utilities
// ============================================================================

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
    case 'accumulate':
    case 'sum':
    case 'count':
      out.add((expr as { sourceFieldId: string }).sourceFieldId)
      return out
    default:
      return out
  }
}

/**
 * Collects grid IDs that are referenced by any `accumulate` node in the expression.
 * Used to know which grids, when updated, should trigger recalculation of the target.
 */
export function getAccumulateSourceGridIds(expr: ExprNode, out = new Set<string>()): Set<string> {
  if (!isExprNode(expr)) return out
  if (expr.op === 'accumulate' || expr.op === 'sum' || expr.op === 'count') {
    const { gridId } = parsePath((expr as { sourceFieldId: string }).sourceFieldId)
    if (gridId) out.add(gridId)
    return out
  }
  if (expr.op === 'add' || expr.op === 'mul' || expr.op === 'and' || expr.op === 'or') {
    for (const arg of (expr as { args?: ExprNode[] }).args ?? []) {
      if (isExprNode(arg)) getAccumulateSourceGridIds(arg, out)
    }
    return out
  }
  if (
    expr.op === 'sub' ||
    expr.op === 'div' ||
    expr.op === 'eq' ||
    expr.op === 'neq' ||
    expr.op === 'gt' ||
    expr.op === 'gte' ||
    expr.op === 'lt' ||
    expr.op === 'lte'
  ) {
    const binary = expr as { left?: ExprNode; right?: ExprNode; args?: ExprNode[] }
    if (binary.left && isExprNode(binary.left)) getAccumulateSourceGridIds(binary.left, out)
    if (binary.right && isExprNode(binary.right)) getAccumulateSourceGridIds(binary.right, out)
    if (Array.isArray(binary.args)) {
      if (binary.args[0] && isExprNode(binary.args[0])) getAccumulateSourceGridIds(binary.args[0], out)
      if (binary.args[1] && isExprNode(binary.args[1])) getAccumulateSourceGridIds(binary.args[1], out)
    }
    return out
  }
  if (expr.op === 'not' && isExprNode(expr.arg)) getAccumulateSourceGridIds(expr.arg, out)
  if (expr.op === 'if') {
    if (isExprNode(expr.cond)) getAccumulateSourceGridIds(expr.cond, out)
    if (isExprNode(expr.then)) getAccumulateSourceGridIds(expr.then, out)
    if (isExprNode(expr.else)) getAccumulateSourceGridIds(expr.else, out)
  }
  if (expr.op === 'regex' && isExprNode(expr.value)) getAccumulateSourceGridIds(expr.value, out)
  return out
}

/**
 * Returns target grid IDs that have at least one calculation rule using `accumulate` over the given source grid.
 * When `sourceGridId`'s data changes, callers should re-run calculations for these grids so fields like "Total amount" update.
 */
export function getGridIdsThatDependOnGridViaAccumulate(
  calculations: Record<string, FieldCalculationRule> | undefined,
  sourceGridId: string,
): string[] {
  if (!calculations || sourceGridId === '') return []
  const targetIds = new Set<string>()
  for (const path of Object.keys(calculations)) {
    const { gridId: targetGridId } = parsePath(path)
    if (!targetGridId) continue
    const rule = calculations[path]
    if (!rule || !isExprNode(rule.expr)) continue
    const sourceIds = getAccumulateSourceGridIds(rule.expr)
    if (sourceIds.has(sourceGridId)) targetIds.add(targetGridId)
  }
  return Array.from(targetIds)
}

/**
 * Builds a map from source grid ID to target grid IDs that have accumulate over it, in a single pass over calculations.
 * More efficient than calling getGridIdsThatDependOnGridViaAccumulate per grid when you need the full dependency map.
 */
export function buildAccumulateDepsBySourceGrid(
  calculations: Record<string, FieldCalculationRule> | undefined,
): Map<string, string[]> {
  const map = new Map<string, Set<string>>()
  if (!calculations) return new Map()
  for (const path of Object.keys(calculations)) {
    const { gridId: targetGridId } = parsePath(path)
    if (!targetGridId) continue
    const rule = calculations[path]
    if (!rule || !isExprNode(rule.expr)) continue
    const sourceIds = getAccumulateSourceGridIds(rule.expr)
    for (const sourceId of sourceIds) {
      let set = map.get(sourceId)
      if (!set) {
        set = new Set<string>()
        map.set(sourceId, set)
      }
      set.add(targetGridId)
    }
  }
  const out = new Map<string, string[]>()
  for (const [sourceId, set] of map) {
    out.set(sourceId, Array.from(set))
  }
  return out
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
  sourceFieldsByTarget: Map<string, Set<string>>
  reverseDeps: Map<string, Set<string>>
} {
  const sourceFieldsByTarget = new Map<string, Set<string>>()
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
    sourceFieldsByTarget.set(targetFieldId, deps)
  }

  return { sourceFieldsByTarget, reverseDeps }
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
  sourceFieldsByTarget: Map<string, Set<string>>,
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

    for (const dep of sourceFieldsByTarget.get(target) ?? []) {
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

/**
 * Build a getColumnValues function from gridData. Returns a new array per call; does not mutate gridData.
 */
function buildGetColumnValues(
  gridData: Record<string, Array<Record<string, unknown>>>,
): (path: string) => unknown[] {
  return (path: string) => {
    const { gridId, fieldId } = parsePath(path)
    if (!gridId || !fieldId) return []
    const rows = gridData[gridId]
    if (!Array.isArray(rows)) return []
    return rows.map((row) => row[fieldId])
  }
}

function evaluateTarget(
  plan: CompiledCalculationPlan,
  rowValues: Record<string, unknown>,
  targetFieldId: string,
  getColumnValues?: (path: string) => unknown[],
): unknown {
  const rule = plan.rulesByTargetFieldId.get(targetFieldId)
  if (!rule) return undefined
  const ctx: FunctionContext = {
    rowValues,
    fieldId: `${plan.gridId}.${targetFieldId}`,
    ...(getColumnValues && { getColumnValues }),
  }
  return evaluateExpr(rule.expr, ctx)
}

/**
 * Generate a hash for calculation rules for cache validation.
 * Uses a simple string serialization approach for performance.
 */
function hashCalculationRules(calculations?: Record<string, FieldCalculationRule>): string {
  if (!calculations) return 'empty'
  const keys = Object.keys(calculations).sort()
  if (keys.length === 0) return 'empty'
  // Fast hash: use sorted keys + simple expression signature
  const parts = keys.map(k => {
    const rule = calculations[k]
    return `${k}:${rule?.expr?.op ?? 'null'}`
  })
  return parts.join('|')
}

/**
 * LRU-like cache for compiled plans.
 * Uses WeakMap for automatic cleanup when calculations object is GC'd,
 * with size limiting per calculations object.
 */
const compiledPlanCache = new WeakMap<
  Record<string, FieldCalculationRule>,
  Map<string, CompiledCalculationPlan>
>()

/**
 * Compile calculation rules for a specific grid into an optimized plan.
 * The plan includes dependency graph analysis for incremental evaluation.
 * 
 * @param gridId - Grid identifier to compile rules for
 * @param calculations - All calculation rules (will be filtered to this grid)
 * @returns Compiled plan ready for evaluation
 * 
 * @example
 * ```ts
 * const plan = compileCalculationsForGrid('invoice', calculations);
 * // plan.rulesByTargetFieldId contains only rules targeting this grid
 * ```
 */
export function compileCalculationsForGrid(
  gridId: string,
  calculations?: Record<string, FieldCalculationRule>,
): CompiledCalculationPlan {
  const rulesByTargetFieldId = toGridTargetRules(gridId, calculations)
  const { sourceFieldsByTarget, reverseDeps } = buildDependencyGraph(gridId, rulesByTargetFieldId)
  return {
    gridId,
    rulesByTargetFieldId,
    sourceFieldsByTarget,
    reverseDeps,
    compiledAt: Date.now(),
    rulesHash: hashCalculationRules(calculations),
  }
}

/**
 * Get cached compiled plan or compile a new one.
 * Uses WeakMap for automatic memory management.
 * 
 * @internal
 */
function getCachedCompiledPlan(
  gridId: string,
  calculations?: Record<string, FieldCalculationRule>,
): CompiledCalculationPlan {
  if (!calculations) {
    cacheStats.misses++
    return compileCalculationsForGrid(gridId, calculations)
  }
  
  const byGrid = compiledPlanCache.get(calculations)
  const cached = byGrid?.get(gridId)
  
  if (cached) {
    cacheStats.hits++
    return cached
  }
  
  cacheStats.misses++
  const compiled = compileCalculationsForGrid(gridId, calculations)
  
  if (byGrid) {
    // Enforce size limit with simple eviction
    if (byGrid.size >= COMPILED_PLAN_CACHE_MAX_SIZE) {
      const firstKey = byGrid.keys().next().value
      if (firstKey) {
        byGrid.delete(firstKey)
        cacheStats.evictions++
      }
    }
    byGrid.set(gridId, compiled)
  } else {
    compiledPlanCache.set(calculations, new Map<string, CompiledCalculationPlan>([[gridId, compiled]]))
  }
  
  cacheStats.size = (byGrid?.size ?? 1)
  return compiled
}

/**
 * Apply calculations to a row using a pre-compiled plan.
 * 
 * This is the optimized path when you have a cached plan.
 * Performs incremental evaluation - only recalculates fields
 * that are impacted by the changed fields.
 * 
 * @param input - Plan, row data, and optional changed field IDs
 * @returns Updated row and metadata about the calculation pass
 * 
 * @example
 * ```ts
 * const plan = compileCalculationsForGrid('invoice', calculations);
 * const result = applyCompiledCalculationsForRow({
 *   plan,
 *   row: { price: 100, qty: 2 },
 *   changedFieldIds: ['price']
 * });
 * ```
 */
export function applyCompiledCalculationsForRow({
  plan,
  row,
  changedFieldIds,
  gridData,
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

  const getColumnValues =
    gridData && Object.keys(gridData).length > 0 ? buildGetColumnValues(gridData) : undefined

  const { order, cyclicTargets } = resolveEvaluationOrder(plan.sourceFieldsByTarget, impactedTargets)
  const nextRow = { ...row }
  const rowValues = buildRowValuesForEval(nextRow, plan.gridId)
  const updatedFieldIds: string[] = []

  for (const targetFieldId of order) {
    const nextValue = evaluateTarget(plan, rowValues, targetFieldId, getColumnValues)
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

/**
 * Apply calculations to a row (main entry point).
 * 
 * Automatically handles plan compilation and caching.
 * For repeated calculations on the same grid, consider using
 * compileCalculationsForGrid + applyCompiledCalculationsForRow directly.
 * 
 * @param input - Grid ID, row data, calculations, and optional changed fields
 * @returns Updated row and metadata about the calculation pass
 * 
 * @example
 * ```ts
 * const result = applyCalculationsForRow({
 *   gridId: 'invoice_grid',
 *   row: { price: 100, qty: 2 },
 *   calculations: {
 *     'invoice_grid.total': { expr: { op: 'mul', args: [...] } }
 *   },
 *   changedFieldIds: ['price']
 * });
 * console.log(result.row.total); // calculated value
 * ```
 */
export function applyCalculationsForRow({
  gridId,
  row,
  calculations,
  changedFieldIds,
  gridData,
}: ApplyCalculationsForRowInput): ApplyCalculationsForRowResult {
  const plan = getCachedCompiledPlan(gridId, calculations)
  return applyCompiledCalculationsForRow({
    plan,
    row,
    changedFieldIds,
    gridData,
  })
}
