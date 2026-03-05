import { NextResponse } from 'next/server'
import { ZodError, type ZodType } from 'zod'

export interface JsonErrorBody {
  error: string
}

export function jsonOk<T>(body: T, init?: ResponseInit): Response {
  return NextResponse.json(body, init)
}

export function jsonError(message: string, status: number): Response {
  return NextResponse.json({ error: message } satisfies JsonErrorBody, { status })
}

export function unauthorized(): Response {
  return jsonError('Unauthorized', 401)
}

export function badRequest(message: string): Response {
  return jsonError(message, 400)
}

export function notFound(message: string): Response {
  return jsonError(message, 404)
}

export function serverError(message = 'Internal server error'): Response {
  return jsonError(message, 500)
}

export interface ParseBodySuccess<T> {
  ok: true
  data: T
}

export interface ParseBodyFailure {
  ok: false
  response: Response
}

export type ParseBodyResult<T> = ParseBodySuccess<T> | ParseBodyFailure

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  invalidJsonMessage = 'Invalid JSON body',
): Promise<ParseBodyResult<T>> {
  const raw = await request.json().catch(() => null)
  if (raw == null) {
    return { ok: false, response: badRequest(invalidJsonMessage) }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, response: zodToBadRequest(parsed.error) }
  }

  return { ok: true, data: parsed.data }
}

export function zodToBadRequest(error: ZodError, fallback = 'Invalid request body'): Response {
  const issue = error.issues[0]
  if (!issue) return badRequest(fallback)
  return badRequest(issue.message || fallback)
}

export async function readParams<T extends Record<string, string>>(
  params: Promise<T>,
): Promise<T> {
  return params
}

export function requireParam(value: unknown, label: string): string | null {
  void label
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim()
}
