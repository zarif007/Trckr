import { parseRequestBody, getErrorMessage } from './lib/validation'
import { deriveAvailableFields } from './lib/prompts'
import { generateExpr } from './lib/generate'
import { badRequest, createRequestLogContext, jsonError, jsonOk } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, 'generate-expr')
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid request body. Expected JSON with "prompt", "gridId", and "fieldId".')
    }

    const parsed = parseRequestBody(body)
    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status)
    }

    const { prompt, gridId, fieldId, purpose, currentTracker } = parsed
    const availableFields = deriveAvailableFields(currentTracker, gridId)

    try {
      logAiStage(logContext, 'request', 'Generating expression.')
      const { expr } = await generateExpr({
        prompt,
        gridId,
        fieldId,
        purpose,
        availableFields,
      })
      return jsonOk({ expr })
    } catch (error) {
      const message = getErrorMessage(error)
      logAiError(logContext, 'generation-error', error)
      return jsonError(message || 'Failed to generate expression.', 500)
    }
  } catch (error) {
    const message = getErrorMessage(error)
    logAiError(logContext, 'route-error', error)
    return jsonError(message || 'Failed to generate expression.', 500)
  }
}
