import {
  applyExprIntentResults,
  collectExprIntents,
  parseFieldPath,
  type ExprIntent,
} from '@/lib/expr-intents'
import type { TrackerLike } from '@/lib/validate-tracker'

export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error'

export interface ToolCallEntry {
  id: string
  fieldPath: string
  purpose: 'validation' | 'calculation' | 'field-rule'
  description: string
  status: ToolCallStatus
  error?: string
  /** Resolved expr (or validation rule payload) when status is done; stored in DB for audit. */
  result?: unknown
}

/** @deprecated Use collectExprIntents from @/lib/expr-intents */
export const detectIntents = collectExprIntents

async function callExprAgent(
  intent: ExprIntent,
  currentTracker: unknown,
  trackerSchemaId?: string | null,
): Promise<{ expr: unknown }> {
  const { gridId, fieldId } = parseFieldPath(intent.fieldPath)

  const res = await fetch('/api/agent/generate-expr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: intent.description,
      gridId,
      fieldId,
      purpose: intent.purpose,
      currentTracker,
      ...(trackerSchemaId ? { trackerSchemaId } : {}),
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(data.error || `Expression generation failed (${res.status})`)
  }

  return res.json()
}

export interface ResolveResult {
  tracker: TrackerLike
  errors: string[]
  toolCalls: ToolCallEntry[]
}

/**
 * Resolve all _intent placeholders in a tracker's validations and calculations
 * by calling the expr agent for each one. Reports progress via onProgress.
 */
export async function resolveExprIntents(
  tracker: TrackerLike,
  onProgress: (toolCalls: ToolCallEntry[]) => void,
  options?: { trackerSchemaId?: string | null },
): Promise<ResolveResult> {
  const intents = collectExprIntents(tracker)
  if (intents.length === 0) {
    return { tracker, errors: [], toolCalls: [] }
  }

  const toolCalls: ToolCallEntry[] = intents.map((intent, i) => ({
    id: `expr-${i}`,
    fieldPath: intent.fieldPath,
    purpose: intent.purpose,
    description: intent.description,
    status: 'pending' as ToolCallStatus,
  }))

  onProgress([...toolCalls])

  const results = await Promise.allSettled(
    intents.map(async (intent, i) => {
      toolCalls[i] = { ...toolCalls[i], status: 'running' }
      onProgress([...toolCalls])

      try {
        const result = await callExprAgent(intent, tracker, options?.trackerSchemaId)
        toolCalls[i] = { ...toolCalls[i], status: 'done', result: result.expr }
        onProgress([...toolCalls])
        return { intent, expr: result.expr }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        toolCalls[i] = { ...toolCalls[i], status: 'error', error: message }
        onProgress([...toolCalls])
        throw err
      }
    }),
  )

  const fulfilled: Array<{ intent: ExprIntent; expr: unknown }> = []
  const errors: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      fulfilled.push(result.value)
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      errors.push(`Expression generation failed: ${reason}`)
    }
  }

  const resolutions = fulfilled.map(({ intent, expr }) => ({ intent, expr }))
  const resolved = applyExprIntentResults(tracker, resolutions)

  return { tracker: resolved, errors, toolCalls }
}
