import { formatGenerationPlanForPrompt, type ReportGenerationPlan } from '@/lib/reports/ast-schemas'

/**
 * LLM pass: decide zero or more per-row derived columns (Expr AST generated separately).
 */

export function getReportCalcSystemPrompt(): string {
  return `You are the calculation planner for a tracker report pipeline.

The query step has already produced a row table with concrete columns. Your job is to list **additional per-row columns** that should be computed with the same expression system as tracker field formulas (references to flattened field paths, arithmetic, conditionals).

Rules:
- When a **generation plan** is provided, only add columns required by its **objectives** / **keyComparisons** (data shape); skip extras.
- Return **columns: []** when the existing output already satisfies the user (including aggregates from the query plan). Do not invent busywork.
- Only suggest columns the user clearly needs: line totals (qty × price), margin %, conditional adjustments, derived scores, etc.
- Each column needs a **unique snake_case or simple id** (name) and a short **instruction** the expression generator will use (which fields, what operation).
- At most 6 columns. Prefer fewer.
- Do not duplicate a column that already exists with the same meaning (same name or obvious synonym).
- Instructions must reference **catalog field paths** as they appear in the column list (e.g. \`items.quantity\`). Reference \`__label\` / \`__dataId\` **only** when **generationPlan.instancePolicy** is \`per_instance_breakdown\` or \`filter_specific_instance\` and those columns are listed.`
}

export function buildReportCalcUserPrompt(params: {
  intentSummary: string
  userQuery: string
  columnKeys: string[]
  sampleRowsJson: string
  generationPlan?: ReportGenerationPlan
}): string {
  const cols =
    params.columnKeys.length > 0 ? params.columnKeys.map((k) => `- ${k}`).join('\n') : '(no columns)'
  return `User request (verbatim): ${params.userQuery}

Intent summary: ${params.intentSummary}

## Generation plan (must follow)
${formatGenerationPlanForPrompt(params.generationPlan)}

Current columns after the query plan:
${cols}

Sample rows (JSON, up to 15):
${params.sampleRowsJson}

Return which derived columns to add before formatting, or an empty list if none are needed.`
}
