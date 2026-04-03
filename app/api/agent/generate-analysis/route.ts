import { buildSchemaContext, buildDataContext, buildConversationContext } from './lib/context'
import { generateAnalysisResponse } from './lib/generate'
import type { AnalystPromptInputs } from './lib/prompts'
import { parseRequestBody, getErrorMessage } from './lib/validation'
import { badRequest, createRequestLogContext, jsonError } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { resolveLlmUsageAttribution, scheduleRecordLlmUsage } from '@/lib/llm-usage'

export async function POST(request: Request) {
 const logContext = createRequestLogContext(request, 'generate-analysis')
 try {
 const authResult = await requireAuthenticatedUser()
 if (!authResult.ok) return authResult.response

 let body: unknown
 try {
 body = await request.json()
 } catch {
 return badRequest(
 'Invalid request body. Expected JSON with "query", "trackerSchema", and "trackerData".',
 )
 }

 const parsed = parseRequestBody(body)
 if (!parsed.ok) {
 return jsonError(parsed.error, parsed.status)
 }

 const attr = await resolveLlmUsageAttribution(authResult.user.id, {
 trackerSchemaId: parsed.trackerSchemaId,
 projectId: parsed.projectId,
 })
 if (!attr.ok) {
 return jsonError(attr.error, attr.status)
 }

 const { query, messages, trackerSchema, trackerData } = parsed
 const schemaContext = buildSchemaContext(trackerSchema)
 const dataContext = buildDataContext(trackerData)
 const conversationContext = buildConversationContext(messages)

 const promptInputs: AnalystPromptInputs = {
 query,
 schemaContext,
 dataContext,
 conversationContext,
 }

 try {
 logAiStage(logContext, 'request', 'Generating analysis response.')
 const { response } = await generateAnalysisResponse(promptInputs, {
 logContext,
 onLlmUsage: (usage) =>
 scheduleRecordLlmUsage({
 userId: authResult.user.id,
 source: 'generate-analysis',
 usage,
 projectId: attr.value.projectId,
 trackerSchemaId: attr.value.trackerSchemaId,
 }),
 })
 return response
 } catch (error) {
 const message = getErrorMessage(error)
 logAiError(logContext, 'all-attempts-failed', error)
 return jsonError(message || 'Failed to generate analysis. Please try again.', 500)
 }
 } catch (error) {
 const message = getErrorMessage(error)
 logAiError(logContext, 'route-error', error)
 return jsonError(message || 'Failed to generate analysis. Please try again.', 500)
 }
}
