import { Role } from '@prisma/client'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { ensureConversationForTracker } from '@/lib/repositories'

/**
 * GET /api/trackers/[id]/conversation
 * Returns the conversation and messages for this tracker (one conversation per tracker).
 * 404 if no conversation exists yet.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  if (!trackerId) return badRequest('Missing tracker id')

  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId: authResult.user.id },
    },
    include: {
      conversations: {
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
      createdAt: conversation.createdAt,
    },
    messages,
  })
}

/**
 * POST /api/trackers/[id]/conversation
 * Ensure a conversation exists for this tracker (create if none). Returns the conversation.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  if (!trackerId) return badRequest('Missing tracker id')

  const conversation = await ensureConversationForTracker(trackerId, authResult.user.id)
  if (!conversation) return notFound('Tracker not found')

  return jsonOk({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
  })
}
