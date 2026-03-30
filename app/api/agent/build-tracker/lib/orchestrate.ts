/**
 * Orchestrates the two-phase agent pipeline: Manager → Builder.
 *
 * Writes phase markers and agent events to a stream controller, allowing the frontend
 * to track progress and show incremental schema previews in real time.
 */

import type { LanguageModelUsage } from 'ai'

import type { RequestLogContext } from '@/lib/api'
import { logAiStage } from '@/lib/ai'
import { encodeEvent, type AgentStreamEvent } from '@/lib/agent/events'
import type { PromptInputs } from './prompts'
import { runManagerAgent } from './manager-agent'
import { runBuilderAgent } from './builder-agent'

export interface OrchestrateOptions {
  logContext?: RequestLogContext
  onManagerLlmUsage?: (usage: LanguageModelUsage) => void
  onBuilderLlmUsage?: (usage: LanguageModelUsage) => void
}

/**
 * Run the full Manager → Builder pipeline, writing NDJSON events to the stream controller.
 *
 * Phases:
 * 1. Manager generates a structured plan (fast, ~2K tokens)
 * 2. Builder streams the tracker schema using the manager's plan as context
 *
 * Errors bubble up to the caller; the route handler writes an `error` event and closes the stream.
 */
export async function orchestrateBuildTracker(
  inputs: PromptInputs,
  controller: ReadableStreamDefaultController<Uint8Array>,
  opts: OrchestrateOptions = {},
): Promise<void> {
  const encoder = new TextEncoder()

  const write = (event: AgentStreamEvent): void => {
    controller.enqueue(encoder.encode(encodeEvent(event)))
  }

  // ─── Phase 1: Manager ───────────────────────────────────────────────────────
  write({ t: 'phase', phase: 'manager' })
  if (opts.logContext) {
    logAiStage(opts.logContext, 'manager-start', 'Starting manager agent.')
  }

  const manager = await runManagerAgent(inputs, write, {
    logContext: opts.logContext,
    onLlmUsage: opts.onManagerLlmUsage,
  })

  // ─── Phase 2: Builder ───────────────────────────────────────────────────────
  write({ t: 'phase', phase: 'builder' })
  if (opts.logContext) {
    logAiStage(opts.logContext, 'builder-start', 'Starting builder agent.')
  }

  await runBuilderAgent(inputs, manager, write, {
    logContext: opts.logContext,
    onLlmUsage: opts.onBuilderLlmUsage,
  })
}
