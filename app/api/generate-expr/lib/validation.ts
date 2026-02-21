/**
 * Request validation and error helpers for generate-expr.
 */

export type ParseResult =
  | { ok: true; prompt: string; gridId: string; fieldId: string; currentTracker: unknown }
  | { ok: false; error: string; status: number }

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

  if (!process.env.DEEPSEEK_API_KEY) {
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
    currentTracker: currentTracker ?? null,
  }
}
