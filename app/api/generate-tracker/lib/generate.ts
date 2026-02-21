/**
 * LLM generation: streaming first, then fallback with generateObject.
 */

import { multiAgentSchema, type MultiAgentSchema } from '@/lib/schemas/multi-agent'
import { deepseek } from '@ai-sdk/deepseek'
import { generateObject, streamObject } from 'ai'
import { getMaxOutputTokens, MAX_FALLBACK_ATTEMPTS } from './constants'
import { getCombinedSystemPrompt, buildUserPrompt, buildFallbackPrompts } from './prompts'
import type { PromptInputs } from './prompts'

const LOG_PREFIX = '[generate-tracker]'

function hasValidOutput(obj: MultiAgentSchema | undefined): boolean {
  return obj != null && (obj.tracker != null || obj.trackerPatch != null)
}

/**
 * Turn a final object into a streaming response (single chunk).
 */
function toStreamResponse(object: MultiAgentSchema): Response {
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

export interface GenerateResult {
  response: Response
  streamed: boolean
}

/**
 * Try streaming first; on failure, run up to MAX_FALLBACK_ATTEMPTS with generateObject and simpler prompts.
 */
export async function generateTrackerResponse(inputs: PromptInputs): Promise<GenerateResult> {
  const systemPrompt = getCombinedSystemPrompt()
  const fullPrompt = buildUserPrompt(inputs)
  const fallbackPrompts = buildFallbackPrompts(inputs)
  const maxTokens = getMaxOutputTokens()

  try {
    const result = streamObject({
      model: deepseek('deepseek-chat'),
      system: systemPrompt,
      prompt: fullPrompt,
      schema: multiAgentSchema,
      maxOutputTokens: maxTokens,
      onFinish: ({ object: finalObject, error: validationError }) => {
        if (validationError) {
          console.error(`${LOG_PREFIX} Final object failed validation:`, validationError)
        }
        if (
          !validationError &&
          finalObject &&
          !finalObject.tracker &&
          !finalObject.trackerPatch
        ) {
          console.warn(
            `${LOG_PREFIX} Stream finished but no tracker/patch in response (possible max tokens or empty output)`,
          )
        }
      },
    })
    return { response: result.toTextStreamResponse(), streamed: true }
  } catch {
    // Stream failed; use generateObject fallbacks
  }

  let lastError: unknown = null
  for (let i = 0; i < MAX_FALLBACK_ATTEMPTS; i++) {
    try {
      const { object } = await generateObject({
        model: deepseek('deepseek-chat'),
        system: systemPrompt,
        prompt: fallbackPrompts[i],
        schema: multiAgentSchema,
        maxOutputTokens: maxTokens,
      })
      const typed = object as MultiAgentSchema
      if (hasValidOutput(typed)) {
        return { response: toStreamResponse(typed), streamed: false }
      }
    } catch (err) {
      lastError = err
      console.warn(
        `${LOG_PREFIX} Fallback ${i + 1}/${MAX_FALLBACK_ATTEMPTS} failed:`,
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  throw lastError
}