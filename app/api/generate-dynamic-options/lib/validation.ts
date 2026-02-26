export type ParseResult =
  | {
    ok: true
    prompt: string
    functionId: string
    functionName: string
    currentTracker: unknown
    sampleResponse?: unknown
  }
  | { ok: false; error: string; status: number }

export function parseRequestBody(body: unknown): ParseResult {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error:
        'Invalid request body. Expected JSON with "prompt", "functionId", and "functionName".',
      status: 400,
    }
  }

  const b = body as Record<string, unknown>
  const prompt = b.prompt
  const functionId = b.functionId
  const functionName = b.functionName

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return {
      ok: false,
      error: 'Prompt is required and must be a non-empty string.',
      status: 400,
    }
  }

  if (!functionId || typeof functionId !== 'string' || functionId.trim() === '') {
    return {
      ok: false,
      error: 'functionId is required and must be a non-empty string.',
      status: 400,
    }
  }

  if (!functionName || typeof functionName !== 'string' || functionName.trim() === '') {
    return {
      ok: false,
      error: 'functionName is required and must be a non-empty string.',
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
    functionId: functionId.trim(),
    functionName: functionName.trim(),
    currentTracker: b.currentTracker ?? null,
    sampleResponse: b.sampleResponse,
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unexpected error'
  }
}
