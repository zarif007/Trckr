/**
 * LLM generation: streaming first, then fallback with generateObject.
 */

import type { LanguageModelUsage } from 'ai'

import { multiAgentSchema, type MultiAgentSchema } from '@/lib/schemas/multi-agent'
import { getDefaultAiProvider, logAiError, logAiStage } from '@/lib/ai'
import type { RequestLogContext } from '@/lib/api'
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

export interface GenerateTrackerResponseOptions {
  logContext?: RequestLogContext
  onLlmUsage?: (usage: LanguageModelUsage) => void
}

/**
 * Try streaming first; on failure, run up to MAX_FALLBACK_ATTEMPTS with generateObject and simpler prompts.
 */
export async function generateTrackerResponse(
  inputs: PromptInputs,
  options: GenerateTrackerResponseOptions = {},
): Promise<GenerateResult> {
  const provider = getDefaultAiProvider()
  const systemPrompt = getCombinedSystemPrompt()
  const fullPrompt = buildUserPrompt(inputs)
  const fallbackPrompts = buildFallbackPrompts(inputs)
  const maxTokens = getMaxOutputTokens()

  try {
    const result = provider.streamObject({
      system: systemPrompt,
      prompt: fullPrompt,
      schema: multiAgentSchema,
      maxOutputTokens: maxTokens,
      onFinish: ({ object: finalObject, error: validationError, usage }) => {
        options.onLlmUsage?.(usage)
        const typedObject = finalObject as MultiAgentSchema | undefined
        if (validationError) {
          if (options.logContext) {
            logAiError(options.logContext, 'stream-finish-validation', validationError)
          } else {
            console.error(`${LOG_PREFIX} Final object failed validation:`, validationError)
          }
        }
        if (
          !validationError &&
          typedObject &&
          !typedObject.tracker &&
          !typedObject.trackerPatch
        ) {
          const message = 'Stream finished with no tracker or trackerPatch.'
          if (options.logContext) {
            logAiStage(options.logContext, 'stream-finish-warning', message)
          } else {
            console.warn(`${LOG_PREFIX} ${message}`)
          }
        }
      },
    })
    if (options.logContext) {
      logAiStage(options.logContext, 'stream-success', `Provider=${provider.id}`)
    }
    return { response: result.toTextStreamResponse(), streamed: true }
  } catch (error) {
    if (options.logContext) {
      logAiError(options.logContext, 'stream-failure', error)
    }
    // Stream failed; use generateObject fallbacks
  }

  let lastError: unknown = null
  for (let i = 0; i < MAX_FALLBACK_ATTEMPTS; i++) {
    try {
      const { object, usage } = await provider.generateObject<MultiAgentSchema>({
        system: systemPrompt,
        prompt: fallbackPrompts[i],
        schema: multiAgentSchema,
        maxOutputTokens: maxTokens,
      })
      options.onLlmUsage?.(usage)
      if (hasValidOutput(object)) {
        if (options.logContext) {
          logAiStage(
            options.logContext,
            'fallback-success',
            `Attempt ${i + 1}/${MAX_FALLBACK_ATTEMPTS}, provider=${provider.id}`,
          )
        }
        return { response: toStreamResponse(object), streamed: false }
      }
    } catch (err) {
      lastError = err
      if (options.logContext) {
        logAiError(options.logContext, `fallback-${i + 1}-failure`, err)
      } else {
        console.warn(
          `${LOG_PREFIX} Fallback ${i + 1}/${MAX_FALLBACK_ATTEMPTS} failed:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    }
  }

  throw lastError
}
