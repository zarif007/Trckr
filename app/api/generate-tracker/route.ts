import { buildConversationContext, buildCurrentStateBlock } from './lib/context'
import { generateTrackerResponse } from './lib/generate'
import type { PromptInputs } from './lib/prompts'
import { parseRequestBody, getErrorMessage } from './lib/validation'

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json(
        {
          error:
            'Invalid request body. Expected JSON with "query" and optional "messages" and "currentTracker".',
        },
        { status: 400 },
      )
    }

    const parsed = parseRequestBody(body)
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status })
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
      const { response } = await generateTrackerResponse(promptInputs)
      return response
    } catch (error) {
      const message = getErrorMessage(error)
      console.error('[generate-tracker] All attempts failed:', message)
      return Response.json(
        {
          error:
            message ||
            'Failed to generate tracker. Please try again.',
        },
        { status: 500 },
      )
    }
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[generate-tracker] Error:', message, error)
    return Response.json(
      {
        error: message || 'Failed to generate tracker. Please try again.',
      },
      { status: 500 },
    )
  }
}
