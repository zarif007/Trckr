import { projectQuestionnaireSchema } from '@/lib/schemas/project-agent'
import { getDefaultAiProvider, logAiError, logAiStage, getConfiguredMaxOutputTokens } from '@/lib/ai'
import { createRequestLogContext, jsonError } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { resolveLlmUsageAttribution, scheduleRecordLlmUsage } from '@/lib/llm-usage'
import { buildQuestionsPrompt, getOrchestratorSystemPrompt } from '../lib/prompts'
import { parseQuestionsBody } from '../lib/validation'

function toStreamResponse(object: unknown): Response {
  const json = JSON.stringify(object)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(json)
      controller.close()
    },
  })
  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, 'ai-project/questions')
  try {
    const authResult = await requireAuthenticatedUser()
    if (!authResult.ok) return authResult.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid request body. Expected JSON with "prompt".', 400)
    }

    const parsed = parseQuestionsBody(body)
    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status)
    }

    const attr = await resolveLlmUsageAttribution(authResult.user.id, {
      projectId: parsed.projectId,
    })
    if (!attr.ok) {
      return jsonError(attr.error, attr.status)
    }

    const provider = getDefaultAiProvider()
    const system = getOrchestratorSystemPrompt()
    const prompt = buildQuestionsPrompt(parsed.prompt)
    const maxOutputTokens = getConfiguredMaxOutputTokens()

    try {
      logAiStage(logContext, 'request', 'Streaming project questionnaire.')
      const result = provider.streamObject({
        system,
        prompt,
        schema: projectQuestionnaireSchema,
        maxOutputTokens,
        onFinish: ({ error: validationError, usage }) => {
          if (validationError) {
            logAiError(logContext, 'stream-finish-validation', validationError)
          }
          scheduleRecordLlmUsage({
            userId: authResult.user.id,
            source: 'ai-project-questions',
            usage,
            projectId: attr.value.projectId,
            trackerSchemaId: attr.value.trackerSchemaId,
          })
        },
      })
      return result.toTextStreamResponse()
    } catch (error) {
      logAiError(logContext, 'stream-failure', error)
    }

    logAiStage(logContext, 'fallback', 'Falling back to non-streaming questionnaire.')
    const { object, usage } = await provider.generateObject({
      system,
      prompt,
      schema: projectQuestionnaireSchema,
      maxOutputTokens,
    })
    scheduleRecordLlmUsage({
      userId: authResult.user.id,
      source: 'ai-project-questions',
      usage,
      projectId: attr.value.projectId,
      trackerSchemaId: attr.value.trackerSchemaId,
    })
    return toStreamResponse(object)
  } catch (error) {
    logAiError(logContext, 'route-error', error)
    return jsonError('Failed to generate questionnaire. Please try again.', 500)
  }
}
