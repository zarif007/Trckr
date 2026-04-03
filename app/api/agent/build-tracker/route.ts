/**
 * POST /api/agent/build-tracker
 *
 * Multi-agent tracker generation endpoint.
 * Runs Manager → Master Data Agent → Builder sequentially and streams NDJSON events to the client.
 *
 * Request body: same shape as /api/generate-tracker
 * Response: NDJSON stream of AgentStreamEvent objects (one per line)
 */

import { badRequest, createRequestLogContext, jsonError } from '@/lib/api'
import { logAiError, logAiStage } from '@/lib/ai'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { resolveLlmUsageAttribution, scheduleRecordLlmUsage } from '@/lib/llm-usage'
import { encodeEvent } from '@/lib/agent/events'
import { resolveMasterDataDefaultScope } from '@/lib/master-data/resolve-default'
import { normalizeMasterDataScope } from '@/lib/master-data-scope'

import {
 buildConversationContext,
 buildCurrentStateBlock,
 hasFullTrackerStateForPatch,
 inferTrackerDirtyFromPayload,
} from '@/lib/tracker-prompt/context'
import {
 parseRequestBody,
 getErrorMessage,
} from '@/lib/tracker-prompt/validation'

import { orchestrateBuildTracker } from './lib/orchestrate'
import type { PromptInputs } from './lib/prompts'

export async function POST(request: Request) {
 const logContext = createRequestLogContext(request, 'agent/build-tracker')

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

 // Resolve masterDataScope deterministically:
 // 1) current tracker schema (if provided)
 // 2) module/project default settings
 // 3) fallback to "tracker"
 let masterDataScope: string | undefined
 if (parsed.masterDataScope) {
 masterDataScope = normalizeMasterDataScope(parsed.masterDataScope) ?? undefined
 }
 const ct = parsed.currentTracker
 if (!masterDataScope && ct && typeof ct === 'object' && !Array.isArray(ct)) {
 const s = (ct as Record<string, unknown>).masterDataScope
 masterDataScope = normalizeMasterDataScope(s) ?? undefined
 }
 if (!masterDataScope && parsed.projectId) {
 const defaultScopeResolution = await resolveMasterDataDefaultScope({
 projectId: parsed.projectId,
 userId: authResult.user.id,
 moduleId: parsed.moduleId ?? null,
 })
 masterDataScope = defaultScopeResolution.inheritedDefault ?? 'tracker'
 }
 if (!masterDataScope) masterDataScope = 'tracker'

 const promptInputs: PromptInputs = {
 query,
 currentStateBlock,
 hasFullTrackerStateForPatch: hasFullTrackerStateForPatch(trackerForPrompt),
 conversationContext,
 hasMessages,
 masterDataScope,
 }

 const encoder = new TextEncoder()

 const stream = new ReadableStream<Uint8Array>({
 async start(controller) {
 try {
 logAiStage(logContext, 'orchestrate-start', 'Starting multi-agent build-tracker.')
 const baseTrackerForPostprocess =
 hasFullTrackerStateForPatch(trackerForPrompt) && trackerForPrompt && typeof trackerForPrompt === 'object'
 ? (trackerForPrompt as Record<string, unknown>)
 : null

 await orchestrateBuildTracker(promptInputs, controller, {
 logContext,
 userId: authResult.user.id,
 projectId: parsed.projectId,
 moduleId: parsed.moduleId,
 masterDataScope,
 currentTracker: baseTrackerForPostprocess,
 onManagerLlmUsage: (usage) =>
 scheduleRecordLlmUsage({
 userId: authResult.user.id,
 source: 'agent-manager',
 usage,
 projectId: attr.value.projectId,
 trackerSchemaId: attr.value.trackerSchemaId,
 }),
 onBuilderLlmUsage: (usage) =>
 scheduleRecordLlmUsage({
 userId: authResult.user.id,
 source: 'agent-builder',
 usage,
 projectId: attr.value.projectId,
 trackerSchemaId: attr.value.trackerSchemaId,
 }),
 })
 } catch (error) {
 const message = getErrorMessage(error)
 logAiError(logContext, 'orchestrate-failed', error)
 try {
 controller.enqueue(
 encoder.encode(encodeEvent({ t: 'error', message: message || 'Generation failed.' })),
 )
 } catch {
 // Controller may already be closed on stream abort
 }
 } finally {
 try {
 controller.close()
 } catch {
 // Already closed
 }
 }
 },
 })

 return new Response(stream, {
 headers: {
 'Content-Type': 'application/x-ndjson; charset=utf-8',
 'Cache-Control': 'no-cache, no-transform',
 // Disable proxy buffering so chunks reach the client immediately
 'X-Accel-Buffering': 'no',
 },
 })
 } catch (error) {
 const message = getErrorMessage(error)
 logAiError(logContext, 'route-error', error)
 return jsonError(message || 'Failed to generate tracker. Please try again.', 500)
 }
}
