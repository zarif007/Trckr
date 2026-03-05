import { buildConversationContext, buildCurrentStateBlock } from './lib/context'
import { generateTrackerResponse } from './lib/generate'
import type { PromptInputs } from './lib/prompts'
import { parseRequestBody, getErrorMessage } from './lib/validation'
import { badRequest, createRequestLogContext, jsonError } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, 'generate-tracker')
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest(
        'Invalid request body. Expected JSON with "query" and optional "messages" and "currentTracker".',
      )
    }

    const parsed = parseRequestBody(body)
    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status)
    }

    const { query, messages, currentTracker } = parsed
    const conversationContext = buildConversationContext(messages)
    const currentStateBlock = buildCurrentStateBlock(currentTracker)
    const hasMessages = messages.length > 0

    const promptInputs: PromptInputs = {
      query,
      currentStateBlock,
      conversationContext,
      hasMessages,
    }

    try {
      logAiStage(logContext, 'request', 'Generating tracker response.')
      const { response } = await generateTrackerResponse(promptInputs, {
        logContext,
      })
      return response
    } catch (error) {
      const message = getErrorMessage(error)
      logAiError(logContext, 'all-attempts-failed', error)
      return jsonError(message || 'Failed to generate tracker. Please try again.', 500)
    }
  } catch (error) {
    const message = getErrorMessage(error)
    logAiError(logContext, 'route-error', error)
    return jsonError(message || 'Failed to generate tracker. Please try again.', 500)
  }
}
