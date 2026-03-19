import { projectPlanSchema } from '@/lib/schemas/project-agent'
import { getDefaultAiProvider, logAiError, logAiStage, getConfiguredMaxOutputTokens } from '@/lib/ai'
import { createRequestLogContext, jsonError } from '@/lib/api'
import { buildPlanPrompt, getPlannerSystemPrompt } from '../lib/prompts'
import { parsePlanBody } from '../lib/validation'

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
  const logContext = createRequestLogContext(request, 'ai-project/plan')
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid request body. Expected JSON with "prompt" and "answers".', 400)
    }

    const parsed = parsePlanBody(body)
    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status)
    }

    const provider = getDefaultAiProvider()
    const system = getPlannerSystemPrompt()
    const prompt = buildPlanPrompt(parsed.prompt, parsed.answers)
    const maxOutputTokens = getConfiguredMaxOutputTokens()

    try {
      logAiStage(logContext, 'request', 'Streaming project plan.')
      const result = provider.streamObject({
        system,
        prompt,
        schema: projectPlanSchema,
        maxOutputTokens,
        onFinish: ({ error: validationError }) => {
          if (validationError) {
            logAiError(logContext, 'stream-finish-validation', validationError)
          }
        },
      })
      return result.toTextStreamResponse()
    } catch (error) {
      logAiError(logContext, 'stream-failure', error)
    }

    logAiStage(logContext, 'fallback', 'Falling back to non-streaming plan.')
    const object = await provider.generateObject({
      system,
      prompt,
      schema: projectPlanSchema,
      maxOutputTokens,
    })
    return toStreamResponse(object)
  } catch (error) {
    logAiError(logContext, 'route-error', error)
    return jsonError('Failed to generate project plan. Please try again.', 500)
  }
}
