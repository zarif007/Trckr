import { ConversationMode, Role } from '@prisma/client'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { ensureConversationForTracker } from '@/lib/repositories'

function parseMode(raw: string | null): ConversationMode | undefined {
  if (!raw) return undefined
  const upper = raw.toUpperCase()
  if (upper === 'BUILDER') return ConversationMode.BUILDER
  if (upper === 'ANALYST') return ConversationMode.ANALYST
  return undefined
}

/**
 * GET /api/trackers/[id]/conversation?mode=BUILDER|ANALYST
 * Returns the conversation and messages for this tracker filtered by mode.
 * 404 if no conversation exists yet.
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

  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId: authResult.user.id },
    },
    include: {
      conversations: {
        where: mode != null ? { mode } : undefined,
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

  const conversation = tracker?.conversations?.[0]
  if (!conversation) {
    return notFound('No conversation yet')
  }

  const messages = conversation.messages.map((m) => ({
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
 * Ensure a conversation exists for this tracker (create if none). Returns the conversation.
 * Body (optional): { mode: 'BUILDER' | 'ANALYST' }
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

  let mode: ConversationMode = ConversationMode.BUILDER
  try {
    const body = await request.json()
    const parsed = parseMode(body?.mode)
    if (parsed) mode = parsed
  } catch {
    // no body or invalid JSON – use default
  }

  const conversation = await ensureConversationForTracker(trackerId, authResult.user.id, mode)
  if (!conversation) return notFound('Tracker not found')

  return jsonOk({
    id: conversation.id,
    title: conversation.title,
    mode: conversation.mode,
    createdAt: conversation.createdAt,
  })
}
