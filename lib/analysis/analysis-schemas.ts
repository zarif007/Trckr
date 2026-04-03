import { z } from 'zod'

export const analysisSectionSchema = z.object({
 id: z.string().min(1),
 title: z.string(),
 kind: z.enum(['narrative', 'chart', 'callout']),
 focus: z.string().describe('What this section should cover; used when writing the analysis.'),
 chartHint: z.enum(['bar', 'line', 'area', 'pie', 'gantt', 'none']).optional(),
})

export type AnalysisSection = z.infer<typeof analysisSectionSchema>

/** Agent 1 (planning LLM): outline only. Query plan is produced by shared `generateQueryPlanV1`. */
export const analysisOutlineOnlySchema = z.object({
 narrative: z.string().describe('One-line summary of the analysis goal.'),
 sections: z.array(analysisSectionSchema).min(1).max(12),
})

export type AnalysisOutlineOnly = z.infer<typeof analysisOutlineOnlySchema>

export const analysisChartSpecSchema = z.discriminatedUnion('type', [
 z.object({
 type: z.literal('bar'),
 xKey: z.string(),
 yKeys: z.array(z.string()).min(1).max(6),
 }),
 z.object({
 type: z.literal('line'),
 xKey: z.string(),
 yKeys: z.array(z.string()).min(1).max(6),
 }),
 z.object({
 type: z.literal('area'),
 xKey: z.string(),
 yKeys: z.array(z.string()).min(1).max(6),
 }),
 z.object({
 type: z.literal('pie'),
 nameKey: z.string(),
 valueKey: z.string(),
 }),
 z.object({
 type: z.literal('gantt'),
 labelKey: z.string(),
 startKey: z.string(),
 endKey: z.string(),
 }),
])

export type AnalysisChartSpec = z.infer<typeof analysisChartSpecSchema>

export const analysisBlockSchema = z.object({
 sectionId: z.string(),
 title: z.string().optional(),
 markdown: z.string(),
 chartSpec: analysisChartSpecSchema.optional(),
 sources: z
 .string()
 .describe(
 'Plain-language attribution: filters, row counts, and tracker data ids from the provenance payload.',
 ),
 /** Filled server-side from query rows; not produced by the model. */
 chartData: z.array(z.record(z.string(), z.unknown())).optional(),
})

export type AnalysisBlock = z.infer<typeof analysisBlockSchema>

const analysisBlockOutputSchema = analysisBlockSchema.omit({ chartData: true })

/** Model output for agent 2 (no chartData). */
export const analysisDocumentFromModelSchema = z.object({
 version: z.literal(1),
 blocks: z.array(analysisBlockOutputSchema).min(1),
})

export const analysisDocumentSchema = z.object({
 version: z.literal(1),
 blocks: z.array(analysisBlockSchema).min(1),
})

export type AnalysisDocumentV1 = z.infer<typeof analysisDocumentSchema>

export const analysisOutlinePayloadSchema = z.object({
 version: z.literal(1),
 narrative: z.string(),
 sections: z.array(analysisSectionSchema),
})

export type AnalysisOutlinePayload = z.infer<typeof analysisOutlinePayloadSchema>

export function parseAnalysisOutlineOnly(data: unknown): AnalysisOutlineOnly | null {
 const r = analysisOutlineOnlySchema.safeParse(data)
 return r.success ? r.data : null
}

export function parseAnalysisDocument(data: unknown): AnalysisDocumentV1 | null {
 const r = analysisDocumentSchema.safeParse(data)
 return r.success ? r.data : null
}

export function parseAnalysisDocumentFromModel(data: unknown) {
 const r = analysisDocumentFromModelSchema.safeParse(data)
 return r.success ? r.data : null
}
