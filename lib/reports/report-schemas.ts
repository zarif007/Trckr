import { z } from 'zod'

import { structuredJsonValueSchema } from '@/lib/insights-query/schemas'

/** @deprecated Use structuredJsonValueSchema from @/lib/insights-query — alias for reports/intent filters. */
export const reportStructuredJsonValueSchema = structuredJsonValueSchema

export const reportGenerationPlanSchema = z.object({
 objectives: z
 .array(z.string())
 .default([])
 .describe(
 'Internal only: concrete data outputs the pipeline must produce (fields, filters, aggregates)—short technical phrases. Never shown to the user in the report UI.',
 ),
 instancePolicy: z
 .enum([
 'not_applicable',
 'combined_all',
 'per_instance_breakdown',
 'filter_specific_instance',
 ])
 .describe(
 'MULTI-instance: combined_all = pooled rows; per_instance_breakdown = keep or group by __label/__dataId; filter_specific_instance = one instance; not_applicable = SINGLE tracker.',
 ),
 keyComparisons: z
 .array(z.string())
 .default([])
 .describe(
 'Internal: group/sort/filter dimensions (e.g. group by status, sort by due_date, by __gridId for multiple grids).',
 ),
 formatterGuidance: z
 .preprocess((v) => (typeof v === 'string' ? v : ''), z.string())
 .describe(
 'Internal: data layout only—column order, rename hints, use markdown_table vs markdown_summary, segmentMarkdownTablesByColumn (__gridId or __label when multiple segments). No narrative or commentary.',
 ),
 caveats: z
 .array(z.string())
 .optional()
 .describe(
 'Internal pipeline hints only; must never appear in formatted report output.',
 ),
})

export type ReportGenerationPlan = z.infer<typeof reportGenerationPlanSchema>

export const reportIntentSchema = z.object({
 narrative: z
 .preprocess((v) => (typeof v === 'string' ? v : ''), z.string())
 .describe('One-line summary of the user request for the audit trail.'),
 gridIds: z
 .array(z.string())
 .default([])
 .describe('Tracker grid ids to include; use empty array if all grids.'),
 metrics: z
 .array(
 z.object({
 label: z.preprocess((v) => (typeof v === 'string' ? v : 'metric'), z.string()),
 aggregation: z.enum(['sum', 'count', 'avg', 'min', 'max', 'none']),
 fieldPath: z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string()).describe('Field id from the tracker schema catalog.'),
 }),
 )
 .default([]),
 groupByFieldPaths: z.array(z.string()).default([]),
 filters: z
 .array(
 z.object({
 fieldPath: z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string()),
 op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']),
 value: z
 .union([structuredJsonValueSchema, z.record(z.string(), z.any())])
 .describe('Filter value: primitive, array for `in`, or a shallow object if needed.'),
 }),
 )
 .default([]),
 timeRange: z
 .object({
 kind: z.enum(['none', 'relative', 'absolute']),
 preset: z
 .enum(['last_7_days', 'last_30_days', 'last_calendar_month', 'all'])
 .optional(),
 applyToRow: z.enum(['createdAt', 'updatedAt']).optional(),
 fromIso: z.string().optional(),
 toIso: z.string().optional(),
 })
 .default({ kind: 'none' }),
 outputStyle: z.enum(['table', 'summary', 'both']).default('table'),
 generationPlan: reportGenerationPlanSchema.describe(
 'Planner output: later steps (query, calc, formatter) must follow this.',
 ),
})

export type ReportIntent = z.infer<typeof reportIntentSchema>

export function defaultReportGenerationPlan(): ReportGenerationPlan {
 return {
 objectives: [],
 instancePolicy: 'not_applicable',
 keyComparisons: [],
 formatterGuidance: '',
 caveats: [],
 }
}

export function normalizeReportIntent(data: unknown): ReportIntent | null {
 const r = reportIntentSchema.safeParse(data)
 if (r.success) return r.data
 const base = reportIntentSchema.omit({ generationPlan: true }).safeParse(data)
 if (!base.success) return null
 return { ...base.data, generationPlan: defaultReportGenerationPlan() }
}

export function formatGenerationPlanForPrompt(plan: ReportGenerationPlan | undefined): string {
 if (!plan || (plan.objectives.length === 0 && !plan.formatterGuidance.trim())) {
 return '(no internal data plan — infer from intent JSON and user request only.)'
 }
 return JSON.stringify(plan, null, 2)
}
