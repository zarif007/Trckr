import {
  buildConversationContext,
  buildCurrentStateBlock,
  hasFullTrackerStateForPatch,
  inferTrackerDirtyFromPayload,
} from './lib/context'
import { generateTrackerResponse } from './lib/generate'
import type { PromptInputs } from './lib/prompts'
import { parseRequestBody, getErrorMessage } from './lib/validation'
import { badRequest, createRequestLogContext, jsonError } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { resolveLlmUsageAttribution, scheduleRecordLlmUsage } from '@/lib/llm-usage'

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, 'generate-tracker')
  try {
    const authResult = await requireAuthenticatedUser()
    if (!authResult.ok) return authResult.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest(
        'Invalid request body. Expected JSON with "query" and optional "messages", "currentTracker", and "dirty".',
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

    const { query, messages, currentTracker, dirty: dirtyFlag } = parsed
    const conversationContext = buildConversationContext(messages)
    const effectiveDirty = dirtyFlag ?? inferTrackerDirtyFromPayload(currentTracker)
    const trackerForPrompt = effectiveDirty ? currentTracker : null
    const currentStateBlock = buildCurrentStateBlock(trackerForPrompt)
    const hasMessages = messages.length > 0

    const promptInputs: PromptInputs = {
      query,
      currentStateBlock,
      hasFullTrackerStateForPatch: hasFullTrackerStateForPatch(trackerForPrompt),
      conversationContext,
      hasMessages,
    }

    try {
      logAiStage(logContext, 'request', 'Generating tracker response.')
      const { response } = await generateTrackerResponse(promptInputs, {
        logContext,
        onLlmUsage: (usage) =>
          scheduleRecordLlmUsage({
            userId: authResult.user.id,
            source: 'generate-tracker',
            usage,
            projectId: attr.value.projectId,
            trackerSchemaId: attr.value.trackerSchemaId,
          }),
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
