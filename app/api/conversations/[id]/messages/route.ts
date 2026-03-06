import { z } from 'zod'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { appendConversationMessage } from '@/lib/repositories'

const toolCallSchema = z.object({
  purpose: z.enum(['validation', 'calculation']),
  fieldPath: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'running', 'done', 'error']),
  error: z.string().optional(),
  result: z.unknown().optional(),
})

const createMessageBodySchema = z
  .object({
    role: z.string().optional(),
    content: z.string().optional(),
    trackerSchemaSnapshot: z.unknown().optional(),
    managerData: z.unknown().optional(),
    toolCalls: z.array(toolCallSchema).optional(),
  })
  .passthrough()

/**
 * POST /api/conversations/[id]/messages
 * Append a message to a conversation. Body: { role: 'USER' | 'ASSISTANT', content: string, trackerSchemaSnapshot?: object, managerData?: object }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const conversationId = requireParam(id, 'conversation id')
  if (!conversationId) return badRequest('Missing conversation id')

  const rawBody = await request.json().catch(() => null)
  if (rawBody == null) return badRequest('Invalid JSON body')
  const parsedBody = createMessageBodySchema.safeParse(rawBody)
  if (!parsedBody.success) return badRequest('Invalid JSON body')
  const body = parsedBody.data

  const role = body.role === 'ASSISTANT' ? 'ASSISTANT' : 'USER'
  const content = typeof body.content === 'string' ? body.content : ''
  const trackerSchemaSnapshot =
    body.trackerSchemaSnapshot != null && typeof body.trackerSchemaSnapshot === 'object'
      ? (body.trackerSchemaSnapshot as object)
      : undefined

  const toolCalls =
    Array.isArray(body.toolCalls) && body.toolCalls.length > 0
      ? body.toolCalls.map((tc) => ({
          purpose: tc.purpose as 'validation' | 'calculation',
          fieldPath: tc.fieldPath,
          description: tc.description,
          status: tc.status as 'pending' | 'running' | 'done' | 'error',
          error: tc.error,
          result: tc.result,
        }))
      : undefined

  const message = await appendConversationMessage({
    conversationId,
    userId: authResult.user.id,
    role,
    content: content ?? '',
    trackerSchemaSnapshot: trackerSchemaSnapshot ?? undefined,
    managerData: body.managerData,
    toolCalls,
  })
  if (!message) return notFound('Conversation not found')

  return jsonOk({
    id: message.id,
    role: message.role === 'USER' ? 'user' : 'assistant',
    content: message.content,
    trackerSchemaSnapshot: message.trackerSchemaSnapshot,
    managerData: message.managerData,
    createdAt: message.createdAt,
  })
}
