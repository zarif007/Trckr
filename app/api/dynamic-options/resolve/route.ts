import type { LanguageModelUsage } from 'ai'

import { resolveDynamicOptions } from '@/lib/dynamic-options'
import { badRequest, createRequestLogContext, jsonError, jsonOk } from '@/lib/api'
import { getDefaultAiProvider, hasDeepSeekApiKey, logAiError, runWithTimeout } from '@/lib/ai'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { resolveLlmUsageAttribution, scheduleRecordLlmUsage } from '@/lib/llm-usage'
import { z } from 'zod'
import { getErrorMessage, parseResolveDynamicOptionsRequest } from './lib/validation'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_PER_WINDOW = 120
const AI_TIMEOUT_MS = 20_000
const AI_MAX_ROWS = 500

const rateLimitByFunctionId = new Map<string, { windowStart: number; count: number }>()

function isRateLimited(functionId: string): boolean {
 const now = Date.now()
 const current = rateLimitByFunctionId.get(functionId)
 if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
 rateLimitByFunctionId.set(functionId, { windowStart: now, count: 1 })
 return false
 }
 current.count += 1
 rateLimitByFunctionId.set(functionId, current)
 return current.count > RATE_LIMIT_MAX_PER_WINDOW
}

function resolveSecretFromEnv(secretRefId: string): string | undefined {
 const normalized = secretRefId
 .trim()
 .toUpperCase()
 .replace(/[^A-Z0-9]/g, '_')
 return (
 process.env[`DYNAMIC_OPTION_SECRET_${normalized}`] ||
 process.env[secretRefId] ||
 undefined
 )
}

const aiExtractSchema = z
 .object({
 rows: z.array(z.record(z.string(), z.any())).default([]),
 })
 .strict()

function stringifyForPrompt(value: unknown): string {
 try {
 const text = JSON.stringify(value, null, 2)
 if (text.length <= 24_000) return text
 return `${text.slice(0, 24_000)}\\n... (truncated)`
 } catch {
 return String(value)
 }
}

async function extractRowsWithAi(input: {
 prompt: string
 payload: unknown
 maxRows: number
 request: Request
}): Promise<{ rows: Array<Record<string, unknown>>; usage?: LanguageModelUsage }> {
 if (!hasDeepSeekApiKey()) {
 return { rows: [] }
 }
 const provider = getDefaultAiProvider()
 const logContext = createRequestLogContext(input.request, 'dynamic-options/resolve')

 const system = [
 'You extract structured records for select options.',
 'Return JSON only.',
 'Use schema: { rows: Array<Record<string, unknown>> }.',
 `Return at most ${Math.max(1, Math.min(input.maxRows, AI_MAX_ROWS))} rows.`,
 ].join(' ')

 const prompt = [
 'Task:',
 input.prompt,
 '',
 'Input JSON:',
 stringifyForPrompt(input.payload),
 ].join('\\n')

 const run = provider.generateObject<{ rows: Array<Record<string, unknown>> }>({
 system,
 prompt,
 schema: aiExtractSchema,
 maxOutputTokens: 1400,
 })

 try {
 const { object, usage } = await runWithTimeout(run, {
 timeoutMs: AI_TIMEOUT_MS,
 timeoutMessage: 'AI extraction timed out',
 })
 const cap = Math.max(1, Math.min(input.maxRows, AI_MAX_ROWS))
 return { rows: object.rows.slice(0, cap), usage }
 } catch (error) {
 logAiError(logContext, 'extract-options', error)
 throw error
 }
}

export async function POST(request: Request) {
 const logContext = createRequestLogContext(request, 'dynamic-options/resolve')
 try {
 const authResult = await requireAuthenticatedUser()
 if (!authResult.ok) return authResult.response

 const body = await request.json().catch(() => null)
 if (body == null) return badRequest('Invalid request body for dynamic options resolve')
 const parsed = parseResolveDynamicOptionsRequest(body)
 if (!parsed.ok) {
 return jsonError(parsed.error, parsed.status)
 }

 const attr = await resolveLlmUsageAttribution(authResult.user.id, {
 projectId: parsed.data.projectId,
 trackerSchemaId: parsed.data.trackerSchemaId,
 })
 if (!attr.ok) {
 return jsonError(attr.error, attr.status)
 }

 if (isRateLimited(parsed.data.functionId)) {
 return jsonError('Rate limit exceeded for dynamic option resolution', 429)
 }

 let resolveAiUsage: LanguageModelUsage | undefined
 const result = await resolveDynamicOptions({
 functionId: parsed.data.functionId,
 context: parsed.data.context as Parameters<typeof resolveDynamicOptions>[0]['context'],
 runtime: parsed.data.runtime,
 args: parsed.data.args,
 forceRefresh: parsed.data.forceRefresh,
 cacheTtlSecondsOverride: parsed.data.cacheTtlSecondsOverride,
 allowHttpGet: true,
 secretResolver: resolveSecretFromEnv,
 aiExtractor: async ({ prompt, input: payload, maxRows }) => {
 const { rows, usage } = await extractRowsWithAi({
 prompt,
 payload,
 maxRows,
 request,
 })
 if (usage) resolveAiUsage = usage
 return rows
 },
 })

 if (resolveAiUsage) {
 scheduleRecordLlmUsage({
 userId: authResult.user.id,
 source: 'dynamic-options-resolve',
 usage: resolveAiUsage,
 projectId: attr.value.projectId,
 trackerSchemaId: attr.value.trackerSchemaId,
 })
 }

 return jsonOk(result)
 } catch (error) {
 const message = getErrorMessage(error)
 logAiError(logContext, 'resolve', error)
 return jsonError(message || 'Failed to resolve dynamic options', 500)
 }
}
