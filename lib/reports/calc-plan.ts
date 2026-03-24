import { z } from 'zod'

import type { ExprNode } from '@/lib/functions/types'
import { normalizeExprNode } from '@/lib/schemas/expr'

import { evaluateReportExprOnRow } from './report-expr'

/** LLM output: which derived columns to build via generate-expr (before formatter). */
export const reportCalcIntentSchema = z.object({
  columns: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z
      .array(
        z.object({
          name: z
            .string()
            .min(1)
            .describe('Unique column id, e.g. line_total or margin_pct'),
          instruction: z
            .string()
            .min(1)
            .describe('One clear sentence: what to compute from which fields (tracker expr AST will be generated).'),
        }),
      )
      .max(6),
  ),
})

export type ReportCalcIntent = z.infer<typeof reportCalcIntentSchema>

const calcColumnPersistedSchema = z.object({
  name: z.string().min(1),
  expr: z.unknown(),
})

/** Persisted recipe for replay (no LLM). */
export const reportCalcPlanV1Schema = z.object({
  version: z.literal(1),
  columns: z.array(calcColumnPersistedSchema),
})

export type ReportCalcPlanV1 = z.infer<typeof reportCalcPlanV1Schema>

export function parseCalcPlan(data: unknown): ReportCalcPlanV1 | null {
  const r = reportCalcPlanV1Schema.safeParse(data)
  if (!r.success) return null
  for (const col of r.data.columns) {
    try {
      normalizeExprNode(col.expr as ExprNode)
    } catch {
      return null
    }
  }
  return r.data
}

export function emptyCalcPlan(): ReportCalcPlanV1 {
  return { version: 1, columns: [] }
}

/**
 * Apply saved ExprNodes in order (later columns may reference earlier derived names).
 */
export function applyCalcPlanToRows(
  rows: Record<string, unknown>[],
  calcPlan: ReportCalcPlanV1 | null,
): Record<string, unknown>[] {
  if (!calcPlan || calcPlan.columns.length === 0) {
    return rows.map((r) => ({ ...r }))
  }
  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row }
    for (const col of calcPlan.columns) {
      const expr = normalizeExprNode(col.expr as ExprNode)
      next[col.name] = evaluateReportExprOnRow(expr, next)
    }
    return next
  })
}
