import { generateDynamicOptionFunction } from './lib/generate'
import { getErrorMessage, parseRequestBody } from './lib/validation'
import { badRequest, createRequestLogContext, jsonError, jsonOk } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { resolveLlmUsageAttribution, scheduleRecordLlmUsage } from '@/lib/llm-usage'

export async function POST(request: Request) {
 const logContext = createRequestLogContext(request, 'generate-dynamic-options')
 try {
 const authResult = await requireAuthenticatedUser()
 if (!authResult.ok) return authResult.response

 const body = await request.json().catch(() => null)
 if (body == null) {
 return badRequest('Invalid request body. Expected JSON with "prompt", "functionId", and "functionName".')
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

 logAiStage(logContext, 'request', 'Generating dynamic options function.')
 const { function: fn, usage } = await generateDynamicOptionFunction({
 prompt: parsed.prompt,
 functionId: parsed.functionId,
 functionName: parsed.functionName,
 currentTracker: parsed.currentTracker,
 sampleResponse: parsed.sampleResponse,
 })

 scheduleRecordLlmUsage({
 userId: authResult.user.id,
 source: 'generate-dynamic-options',
 usage,
 projectId: attr.value.projectId,
 trackerSchemaId: attr.value.trackerSchemaId,
 })

 return jsonOk({ function: fn })
 } catch (error) {
 const message = getErrorMessage(error)
 logAiError(logContext, 'route-error', error)
 return jsonError(message || 'Failed to generate dynamic options function', 500)
 }
}
