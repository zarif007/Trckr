import { buildSchemaContext, buildDataContext, buildConversationContext } from './lib/context'
import { generateAnalysisResponse } from './lib/generate'
import type { AnalystPromptInputs } from './lib/prompts'
import { parseRequestBody, getErrorMessage } from './lib/validation'
import { badRequest, createRequestLogContext, jsonError } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, 'generate-analysis')
  try {
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
      const { response } = await generateAnalysisResponse(promptInputs, { logContext })
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
