import { hasDeepSeekApiKey } from '@/lib/ai'

export type ParseResult =
 | {
 ok: true
 query: string
 messages: unknown[]
 trackerSchema: unknown
 trackerData: unknown
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
 error: 'Invalid request body. Expected JSON with "query", "trackerSchema", and "trackerData".',
 status: 400,
 }
 }

 const b = body as Record<string, unknown>
 const query = b.query
 const messages = b.messages
 const trackerSchema = b.trackerSchema
 const trackerData = b.trackerData

 if (!query || typeof query !== 'string' || query.trim() === '') {
 return { ok: false, error: 'Query is required and must be a non-empty string.', status: 400 }
 }

 if (!hasDeepSeekApiKey()) {
 return { ok: false, error: 'DEEPSEEK_API_KEY is not configured', status: 500 }
 }

 return {
 ok: true,
 query: query.trim(),
 messages: Array.isArray(messages) ? messages : [],
 trackerSchema: trackerSchema ?? null,
 trackerData: trackerData ?? null,
 trackerSchemaId: optionalId(b.trackerSchemaId),
 projectId: optionalId(b.projectId),
 }
}
