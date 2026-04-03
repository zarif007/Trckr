/**
 * Builder Agent — generates the tracker schema from the manager's plan.
 *
 * Streams the schema via partialObjectStream, writing builder_partial events for each chunk.
 * Falls back to generateObject if streaming fails.
 */

import { streamObject } from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import type { LanguageModelUsage } from 'ai'

import type { RequestLogContext } from '@/lib/api'
import { getDefaultAiProvider, logAiError, logAiStage } from '@/lib/ai'
import { repairStructuredJsonText } from '@/lib/ai/structured-json-repair'
import { builderOutputSchema, type BuilderOutput } from '@/lib/agent/builder-schema'
import type { ManagerSchema } from '@/lib/schemas/multi-agent'
import type { AgentStreamEvent } from '@/lib/agent/events'
import type { PromptInputs } from './prompts'
import { getBuilderSystemPrompt, buildBuilderUserPrompt, buildBuilderFallbackPrompts } from './prompts'
import { BUILDER_MAX_TOKENS, MAX_FALLBACK_ATTEMPTS } from './constants'

const LOG_PREFIX = '[agent/builder]'

export interface RunBuilderAgentOptions {
  logContext?: RequestLogContext
  onLlmUsage?: (usage: LanguageModelUsage) => void
}

function hasValidOutput(output: BuilderOutput | undefined): boolean {
  return output != null && (output.tracker != null || output.trackerPatch != null)
}

/**
 * Run the builder agent.
 * Writes `builder_partial` events during streaming, then a `builder_finish` event on completion.
 * Falls back to generateObject on stream failure.
 */
export async function runBuilderAgent(
  inputs: PromptInputs,
  manager: ManagerSchema,
  write: (event: AgentStreamEvent) => void,
  opts: RunBuilderAgentOptions = {},
): Promise<BuilderOutput> {
  const system = getBuilderSystemPrompt()
  const prompt = buildBuilderUserPrompt(inputs, manager)

  // ─── Try streaming first ────────────────────────────────────────────────────
  try {
    let finishUsage: LanguageModelUsage | undefined
    let finishObject: BuilderOutput | undefined
    let lastPartial: Partial<BuilderOutput> | undefined

    const streamResult = streamObject({
      model: deepseek('deepseek-chat'),
      system,
      prompt,
      schema: builderOutputSchema,
      maxOutputTokens: BUILDER_MAX_TOKENS,
      // onFinish is the most reliable way to get final object + usage from streamObject
      onFinish: ({ object, usage }) => {
        finishObject = object as BuilderOutput | undefined
        finishUsage = usage
      },
      experimental_repairText: repairStructuredJsonText,
    })

    for await (const partial of streamResult.partialObjectStream) {
      lastPartial = partial as Partial<BuilderOutput>
      write({ t: 'builder_partial', partial: lastPartial })
    }

    if (finishUsage) {
      opts.onLlmUsage?.(finishUsage)
    }
    if (opts.logContext) {
      logAiStage(opts.logContext, 'builder-stream-complete', 'Builder stream finished.')
    }

    const output = finishObject ?? (lastPartial as BuilderOutput | undefined)
    if (!hasValidOutput(output)) {
      throw new Error('Builder produced no tracker or trackerPatch after streaming.')
    }
    return output as BuilderOutput
  } catch (error) {
    if (opts.logContext) {
      logAiError(opts.logContext, 'builder-stream-failed', error)
    } else {
      console.warn(
        `${LOG_PREFIX} Streaming failed, falling back to generateObject:`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  // ─── Fallback: generateObject attempts ─────────────────────────────────────
  const provider = getDefaultAiProvider()
  const fallbackPrompts = buildBuilderFallbackPrompts(inputs, manager)
  let lastError: unknown = null

  for (let i = 0; i < MAX_FALLBACK_ATTEMPTS; i++) {
    try {
      const fallbackPrompt = fallbackPrompts[i] ?? prompt
      const { object, usage } = await provider.generateObject<BuilderOutput>({
        system,
        prompt: fallbackPrompt,
        schema: builderOutputSchema,
        maxOutputTokens: BUILDER_MAX_TOKENS,
      })
      opts.onLlmUsage?.(usage)
      if (hasValidOutput(object)) {
        if (opts.logContext) {
          logAiStage(
            opts.logContext,
            'builder-fallback-success',
            `Attempt ${i + 1}/${MAX_FALLBACK_ATTEMPTS}`,
          )
        }
        return object
      }
    } catch (err) {
      lastError = err
      if (opts.logContext) {
        logAiError(opts.logContext, `builder-fallback-${i + 1}`, err)
      } else {
        console.warn(
          `${LOG_PREFIX} Fallback ${i + 1}/${MAX_FALLBACK_ATTEMPTS} failed:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    }
  }

  throw lastError ?? new Error('Builder: all streaming and fallback attempts failed.')
}
