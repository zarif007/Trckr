import { resolveDynamicOptions } from '@/lib/dynamic-options'
import { deepseek } from '@ai-sdk/deepseek'
import { generateObject } from 'ai'
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
}): Promise<Array<Record<string, unknown>>> {
  if (!process.env.DEEPSEEK_API_KEY) {
    return []
  }

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

  const run = generateObject({
    model: deepseek('deepseek-chat'),
    system,
    prompt,
    schema: aiExtractSchema,
    maxOutputTokens: 1400,
  })

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI extraction timed out')), AI_TIMEOUT_MS)
  )

  const { object } = await Promise.race([run, timeout])
  return object.rows.slice(0, Math.max(1, Math.min(input.maxRows, AI_MAX_ROWS)))
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = parseResolveDynamicOptionsRequest(body)
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status })
    }

    if (isRateLimited(parsed.data.functionId)) {
      return Response.json(
        { error: 'Rate limit exceeded for dynamic option resolution' },
        { status: 429 }
      )
    }

    const result = await resolveDynamicOptions({
      functionId: parsed.data.functionId,
      context: parsed.data.context as Parameters<typeof resolveDynamicOptions>[0]['context'],
      runtime: parsed.data.runtime,
      args: parsed.data.args,
      forceRefresh: parsed.data.forceRefresh,
      cacheTtlSecondsOverride: parsed.data.cacheTtlSecondsOverride,
      allowHttpGet: true,
      secretResolver: resolveSecretFromEnv,
      aiExtractor: ({ prompt, input: payload, maxRows }) =>
        extractRowsWithAi({
          prompt,
          payload,
          maxRows,
        }),
    })

    return Response.json(result)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[dynamic-options/resolve] Error:', message)
    return Response.json(
      { error: message || 'Failed to resolve dynamic options' },
      { status: 500 }
    )
  }
}
