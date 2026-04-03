import { z } from 'zod'

import {
 badRequest,
 notFound,
 parseJsonBody,
 readParams,
 unauthorized,
} from '@/lib/api/http'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { parseQueryPlan, type QueryPlanV1 } from '@/lib/reports/ast-schemas'
import { isReplayable, runReportPipeline } from '@/lib/reports/orchestrator'
import {
 mergeQueryPlanWithOverrides,
 replayQueryOverridesSchema,
} from '@/lib/reports/query-plan-overrides'
import { getReportForUser } from '@/lib/reports/report-repository'

const bodySchema = z.object({
 prompt: z.string().optional(),
 regenerate: z.boolean().optional(),
 replayQueryOverrides: replayQueryOverridesSchema.optional(),
})

export async function POST(
 request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const auth = await requireAuthenticatedUser()
 if (!auth.ok) return unauthorized()

 const { id } = await readParams(context.params)
 const report = await getReportForUser(id, auth.user.id)
 if (!report) return notFound('Report not found.')

 const parsed = await parseJsonBody(request, bodySchema)
 if (!parsed.ok) return parsed.response

 const prompt = parsed.data.prompt?.trim() ?? ''
 const regenerate = parsed.data.regenerate === true
 const replayable = isReplayable(report) && !regenerate
 const savedPrompt = report.definition?.userPrompt?.trim() ?? ''

 if (!replayable && !prompt && !savedPrompt) {
 return badRequest('Prompt is required for the first run.')
 }

 let replayQueryPlan: QueryPlanV1 | undefined
 if (replayable && parsed.data.replayQueryOverrides !== undefined) {
 const base = parseQueryPlan(report.definition?.queryPlan)
 if (!base) {
 return badRequest('Invalid saved recipe.')
 }
 const merged = mergeQueryPlanWithOverrides(base, parsed.data.replayQueryOverrides)
 if (!merged.ok) {
 return badRequest(merged.error)
 }
 replayQueryPlan = merged.plan
 }

 const encoder = new TextEncoder()
 const stream = new ReadableStream<Uint8Array>({
 async start(controller) {
 const writeNdjsonLine = async (line: string) => {
 controller.enqueue(encoder.encode(line))
 }
 try {
 await runReportPipeline({
 userId: auth.user.id,
 reportId: id,
 userPrompt: prompt || savedPrompt,
 regenerate,
 replayQueryPlan,
 writeNdjsonLine,
 })
 } catch {
 // `forward` in the orchestrator already emitted `error` when possible.
 } finally {
 controller.close()
 }
 },
 })

 return new Response(stream, {
 headers: {
 'Content-Type': 'application/x-ndjson; charset=utf-8',
 'Cache-Control': 'no-store',
 },
 })
}
