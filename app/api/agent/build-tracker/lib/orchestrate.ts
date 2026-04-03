/**
 * Orchestrates the three-phase agent pipeline: Manager → Master Data → Builder.
 *
 * Writes phase markers and agent events to a stream controller, allowing the frontend
 * to track progress and show incremental schema previews in real time.
 */

import type { LanguageModelUsage } from 'ai'

import type { RequestLogContext } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'
import { encodeEvent, type AgentStreamEvent } from '@/lib/agent/events'
import type { PromptInputs } from './prompts'
import { runManagerAgent } from './manager-agent'
import { runMasterDataAgent } from './master-data-agent'
import { runBuilderAgent } from './builder-agent'
import { postProcessBuilderOutput } from './postprocess'

export interface OrchestrateOptions {
 logContext?: RequestLogContext
 userId?: string
 projectId?: string | null
 moduleId?: string | null
 masterDataScope?: string | null
 currentTracker?: Record<string, unknown> | null
 onManagerLlmUsage?: (usage: LanguageModelUsage) => void
 onBuilderLlmUsage?: (usage: LanguageModelUsage) => void
}

/**
 * Run the full Manager → Master Data → Builder pipeline, writing NDJSON events to the stream.
 *
 * Phases:
 * 1. Manager generates a structured plan and declares required master data entities
 * 2. Master Data Agent pre-creates/finds master data trackers in the right folder (skipped when
 * masterDataScope is "tracker" or no master data is needed)
 * 3. Builder streams the tracker schema using the manager plan + resolved master data IDs
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
 if (opts.logContext) logAiStage(opts.logContext, 'manager-start', 'Starting manager agent.')

 const manager = await runManagerAgent(inputs, write, {
 logContext: opts.logContext,
 onLlmUsage: opts.onManagerLlmUsage,
 })

 // ─── Phase 2: Master Data Agent ─────────────────────────────────────────────
 const requiredMasterData = Array.isArray(
 (manager as Record<string, unknown>).requiredMasterData,
 )
 ? ((manager as Record<string, unknown>).requiredMasterData as Array<{
 key: string
 name: string
 labelFieldId?: string
 }>)
 : []

 const effectiveScope = opts.masterDataScope?.trim()
 const needsMasterData =
 requiredMasterData.length > 0 &&
 !!opts.userId &&
 !!opts.projectId &&
 (effectiveScope === 'module' || effectiveScope === 'project')

 let builderInputs: PromptInputs = inputs

 if (needsMasterData) {
 write({ t: 'phase', phase: 'master-data' })
 try {
 const resolvedMasterData = await runMasterDataAgent(requiredMasterData, write, {
 logContext: opts.logContext,
 userId: opts.userId!,
 projectId: opts.projectId!,
 moduleId: opts.moduleId,
 scope: effectiveScope as 'module' | 'project',
 })
 if (resolvedMasterData.length) {
 builderInputs = { ...inputs, resolvedMasterData, masterDataScope: effectiveScope }
 }
 } catch (err) {
 if (opts.logContext) logAiError(opts.logContext, 'master-data-agent-failed', err)
 // Non-fatal — builder falls back to PATH B (placeholder approach)
 }
 }

 // ─── Phase 3: Builder ───────────────────────────────────────────────────────
 write({ t: 'phase', phase: 'builder' })
 if (opts.logContext) logAiStage(opts.logContext, 'builder-start', 'Starting builder agent.')

 const builderOutput = await runBuilderAgent(builderInputs, manager, write, {
 logContext: opts.logContext,
 onLlmUsage: opts.onBuilderLlmUsage,
 })

 if (!opts.userId) {
 write({ t: 'builder_finish', output: builderOutput })
 return
 }

 const scopeForPost = effectiveScope ?? 'tracker'
 const postProcessed = await postProcessBuilderOutput(builderOutput, {
 masterDataScope: scopeForPost,
 userId: opts.userId,
 projectId: opts.projectId ?? null,
 moduleId: opts.moduleId ?? null,
 baseTracker: opts.currentTracker ?? null,
 })

 write({ t: 'builder_finish', output: postProcessed.output, toolCalls: postProcessed.toolCalls })
}
