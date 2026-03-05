import { generateDynamicOptionFunction } from './lib/generate'
import { getErrorMessage, parseRequestBody } from './lib/validation'
import { badRequest, createRequestLogContext, jsonError, jsonOk } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, 'generate-dynamic-options')
  try {
    const body = await request.json().catch(() => null)
    if (body == null) {
      return badRequest('Invalid request body. Expected JSON with "prompt", "functionId", and "functionName".')
    }
    const parsed = parseRequestBody(body)
    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status)
    }

    logAiStage(logContext, 'request', 'Generating dynamic options function.')
    const result = await generateDynamicOptionFunction({
      prompt: parsed.prompt,
      functionId: parsed.functionId,
      functionName: parsed.functionName,
      currentTracker: parsed.currentTracker,
      sampleResponse: parsed.sampleResponse,
    })

    return jsonOk(result)
  } catch (error) {
    const message = getErrorMessage(error)
    logAiError(logContext, 'route-error', error)
    return jsonError(message || 'Failed to generate dynamic options function', 500)
  }
}
