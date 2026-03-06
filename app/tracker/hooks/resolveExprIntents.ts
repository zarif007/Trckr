import type { FieldCalculationRule } from '@/lib/functions/types'
import type { TrackerLike } from '@/lib/validate-tracker'

export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error'

export interface ToolCallEntry {
  id: string
  fieldPath: string
  purpose: 'validation' | 'calculation'
  description: string
  status: ToolCallStatus
  error?: string
  /** Resolved expr (or validation rule payload) when status is done; stored in DB for audit. */
  result?: unknown
}

interface IntentLocation {
  fieldPath: string
  purpose: 'validation' | 'calculation'
  description: string
  /** For validations: index into the rules array */
  ruleIndex?: number
}

interface ValidationRuleWithIntent {
  type: string
  _intent?: string
  message?: string
  [key: string]: unknown
}

interface CalculationWithIntent {
  _intent?: string
  expr?: unknown
  [key: string]: unknown
}

function isIntentValidationRule(rule: unknown): rule is ValidationRuleWithIntent {
  if (!rule || typeof rule !== 'object') return false
  const r = rule as Record<string, unknown>
  return r.type === 'expr' && typeof r._intent === 'string'
}

function isIntentCalculation(entry: unknown): entry is CalculationWithIntent {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as Record<string, unknown>
  return typeof e._intent === 'string' && !e.expr
}

export function detectIntents(tracker: TrackerLike): IntentLocation[] {
  const intents: IntentLocation[] = []

  const validations = tracker.validations ?? {}
  for (const [fieldPath, rules] of Object.entries(validations)) {
    if (!Array.isArray(rules)) continue
    for (let i = 0; i < rules.length; i++) {
      if (isIntentValidationRule(rules[i])) {
        intents.push({
          fieldPath,
          purpose: 'validation',
          description: (rules[i] as ValidationRuleWithIntent)._intent!,
          ruleIndex: i,
        })
      }
    }
  }

  const calculations = (tracker as TrackerLike & { calculations?: Record<string, unknown> }).calculations ?? {}
  for (const [fieldPath, entry] of Object.entries(calculations)) {
    if (isIntentCalculation(entry)) {
      intents.push({
        fieldPath,
        purpose: 'calculation',
        description: (entry as CalculationWithIntent)._intent!,
      })
    }
  }

  return intents
}

async function callExprAgent(
  intent: IntentLocation,
  currentTracker: unknown,
): Promise<{ expr: unknown }> {
  const dotIndex = intent.fieldPath.indexOf('.')
  const gridId = intent.fieldPath.substring(0, dotIndex)
  const fieldId = intent.fieldPath.substring(dotIndex + 1)

  const res = await fetch('/api/generate-expr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: intent.description,
      gridId,
      fieldId,
      purpose: intent.purpose,
      currentTracker,
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
): Promise<ResolveResult> {
  const intents = detectIntents(tracker)
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
        const result = await callExprAgent(intent, tracker)
        toolCalls[i] = { ...toolCalls[i], status: 'done', result: result.expr }
        onProgress([...toolCalls])
        return { index: i, intent, expr: result.expr }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        toolCalls[i] = { ...toolCalls[i], status: 'error', error: message }
        onProgress([...toolCalls])
        throw err
      }
    }),
  )

  const validations = { ...(tracker.validations ?? {}) }
  const calculations = {
    ...((tracker as TrackerLike & { calculations?: Record<string, unknown> }).calculations ?? {}),
  }
  const errors: string[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      continue
    }

    const { intent, expr } = result.value

    if (intent.purpose === 'validation' && intent.ruleIndex != null) {
      const rules = [...(validations[intent.fieldPath] ?? [])]
      const existingRule = rules[intent.ruleIndex] as ValidationRuleWithIntent | undefined
      if (existingRule) {
        const { _intent: _, ...rest } = existingRule
        rules[intent.ruleIndex] = { ...rest, expr } as unknown as typeof rules[number]
      }
      validations[intent.fieldPath] = rules
    } else if (intent.purpose === 'calculation') {
      calculations[intent.fieldPath] = { expr } as FieldCalculationRule
    }
  }

  for (const result of results) {
    if (result.status === 'rejected') {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      errors.push(`Expression generation failed: ${reason}`)
    }
  }

  const resolved = { ...tracker, validations, calculations } as TrackerLike
  return { tracker: resolved, errors, toolCalls }
}
