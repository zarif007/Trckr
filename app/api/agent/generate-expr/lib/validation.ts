import { hasDeepSeekApiKey } from '@/lib/ai'

/**
 * Request validation and error helpers for generate-expr.
 */

export type ParseResult =
  | {
      ok: true
      prompt: string
      gridId: string
      fieldId: string
      purpose: 'validation' | 'calculation' | 'field-rule'
      currentTracker: unknown
      trackerSchemaId?: string
      projectId?: string
    }
  | { ok: false; error: string; status: number }

function optionalId(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value !== 'string') return undefined
  const t = value.trim()
  return t.length ? t : undefined
}

export function getErrorMessage(error: unknown): string {
  if (error == null || error === undefined) {
    return 'An unexpected error occurred'
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'An unexpected error occurred'
  }
}

export function parseRequestBody(body: unknown): ParseResult {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error: 'Invalid request body. Expected JSON with "prompt", "gridId", and "fieldId".',
      status: 400,
    }
  }

  const b = body as Record<string, unknown>
  const prompt = b.prompt
  const gridId = b.gridId
  const fieldId = b.fieldId
  const purpose = b.purpose
  const currentTracker = b.currentTracker

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return {
      ok: false,
      error: 'Prompt is required and must be a non-empty string.',
      status: 400,
    }
  }

  if (!gridId || typeof gridId !== 'string' || gridId.trim() === '') {
    return {
      ok: false,
      error: 'gridId is required and must be a non-empty string.',
      status: 400,
    }
  }

  if (!fieldId || typeof fieldId !== 'string' || fieldId.trim() === '') {
    return {
      ok: false,
      error: 'fieldId is required and must be a non-empty string.',
      status: 400,
    }
  }

  const normalizedPurpose =
    purpose === 'calculation' || purpose === 'validation' || purpose === 'field-rule'
      ? purpose
      : 'validation'

  if (!hasDeepSeekApiKey()) {
    return {
      ok: false,
      error: 'DEEPSEEK_API_KEY is not configured',
      status: 500,
    }
  }

  return {
    ok: true,
    prompt: prompt.trim(),
    gridId: gridId.trim(),
    fieldId: fieldId.trim(),
    purpose: normalizedPurpose,
    currentTracker: currentTracker ?? null,
    trackerSchemaId: optionalId(b.trackerSchemaId),
    projectId: optionalId(b.projectId),
  }
}
