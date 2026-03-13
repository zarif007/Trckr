import { Role } from '@prisma/client'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import {
  createConversation,
  ensureConversationForTracker,
  findConversationWithMessages,
} from '@/lib/repositories'

type ConversationMode = 'BUILDER' | 'ANALYST'

function parseMode(raw: string | null): ConversationMode | undefined {
  if (!raw) return undefined
  const upper = raw.toUpperCase()
  if (upper === 'BUILDER') return 'BUILDER'
  if (upper === 'ANALYST') return 'ANALYST'
  return undefined
}

function mapMessages(conversation: { messages: Array<{
  id: string
  role: Role
  content: string
  trackerSchemaSnapshot: unknown
  managerData: unknown
  createdAt: Date
  toolCalls: Array<{
    id: string
    purpose: string
    fieldPath: string
    description: string
    status: string
    error: string | null
    result: unknown
  }>
}> }) {
  return conversation.messages.map((m) => ({
    id: m.id,
    role: m.role === Role.USER ? 'user' : 'assistant',
    content: m.content,
    trackerData: m.trackerSchemaSnapshot as unknown,
    managerData: m.managerData as unknown,
    createdAt: m.createdAt,
    toolCalls: m.toolCalls?.map((tc) => ({
      id: tc.id,
      purpose: tc.purpose,
      fieldPath: tc.fieldPath,
      description: tc.description,
      status: tc.status,
      error: tc.error ?? undefined,
      result: tc.result ?? undefined,
    })),
  }))
}

/**
 * GET /api/trackers/[id]/conversation?mode=BUILDER|ANALYST&conversationId=...
 * If conversationId is set: return that conversation and messages (404 if wrong tracker/user).
 * Otherwise: return the latest conversation for this tracker and mode. 404 if none.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  if (!trackerId) return badRequest('Missing tracker id')

  const url = new URL(request.url)
  const mode = parseMode(url.searchParams.get('mode'))
  const conversationIdParam = url.searchParams.get('conversationId')

  if (conversationIdParam) {
    const conversation = await findConversationWithMessages(
      conversationIdParam,
      authResult.user.id,
    )
    if (
      !conversation ||
      conversation.trackerSchemaId !== trackerId
    ) {
      return notFound('Conversation not found')
    }
    const messages = mapMessages(conversation)
    const conv = conversation as unknown as { id: string; title: string | null; mode: ConversationMode; createdAt: Date }
    return jsonOk({
      conversation: {
        id: conv.id,
        title: conv.title,
        mode: conv.mode,
        createdAt: conv.createdAt,
      },
      messages,
    })
  }

  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId: authResult.user.id },
    },
    include: {
      conversations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma ConversationWhereInput may not include mode in generated types
        where: mode != null ? ({ mode } as any) : undefined,
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { toolCalls: true },
          },
        },
      },
    },
  })

  type ConvWithMessages = Parameters<typeof mapMessages>[0] & { id: string; title: string | null; mode: ConversationMode; createdAt: Date }
  const conversations = (tracker as unknown as { conversations?: ConvWithMessages[] })?.conversations
  const conversation = conversations?.[0]
  if (!conversation) {
    return notFound('No conversation yet')
  }

  const messages = mapMessages(conversation)
  return jsonOk({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      createdAt: conversation.createdAt,
    },
    messages,
  })
}

/**
 * POST /api/trackers/[id]/conversation
 * If body.createNew === true: always create a new conversation.
 * Otherwise: ensure a conversation exists (get latest or create one).
 * Body (optional): { mode: 'BUILDER' | 'ANALYST', createNew?: boolean, title?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  if (!trackerId) return badRequest('Missing tracker id')

  let mode: ConversationMode = 'BUILDER'
  let createNew = false
  let title: string | undefined
  try {
    const body = await request.json()
    const parsed = parseMode(body?.mode)
    if (parsed) mode = parsed
    if (body?.createNew === true) createNew = true
    if (typeof body?.title === 'string') title = body.title
  } catch {
    // no body or invalid JSON – use default
  }

  const conversation = createNew
    ? await createConversation(trackerId, authResult.user.id, mode, title)
    : await ensureConversationForTracker(trackerId, authResult.user.id, mode)
  if (!conversation) return notFound('Tracker not found')

  const conv = conversation as unknown as { id: string; title: string | null; mode: ConversationMode; createdAt: Date }
  return jsonOk({
    id: conv.id,
    title: conv.title,
    mode: conv.mode,
    createdAt: conv.createdAt,
  })
}
