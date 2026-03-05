import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'

export async function findLatestConversationForTracker(
  trackerId: string,
  userId: string,
  includeMessages: boolean,
) {
  return prisma.conversation.findFirst({
    where: {
      trackerSchemaId: trackerId,
      trackerSchema: {
        project: { userId },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: includeMessages
      ? { messages: { orderBy: { createdAt: 'asc' } } }
      : undefined,
  })
}

export async function findLatestConversationForTrackerWithMessages(
  trackerId: string,
  userId: string,
) {
  return prisma.conversation.findFirst({
    where: {
      trackerSchemaId: trackerId,
      trackerSchema: {
        project: { userId },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function ensureConversationForTracker(trackerId: string, userId: string) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId },
    },
    select: { id: true },
  })
  if (!tracker) return null

  const latest = await findLatestConversationForTracker(trackerId, userId, false)
  if (latest) return latest

  return prisma.conversation.create({
    data: { trackerSchemaId: trackerId },
  })
}

export async function userOwnsConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      trackerSchema: {
        project: { userId },
      },
    },
    select: { id: true },
  })
  return !!conversation
}

type ManagerData = {
  thinking?: unknown
  [key: string]: unknown
}

function sanitizeManagerData(input: unknown): object | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined
  const sanitized = { ...(input as ManagerData) }
  if ('thinking' in sanitized) delete sanitized.thinking
  return sanitized
}

export async function appendConversationMessage(params: {
  conversationId: string
  userId: string
  role: 'USER' | 'ASSISTANT'
  content: string
  trackerSchemaSnapshot?: object
  managerData?: unknown
}) {
  const canAccess = await userOwnsConversation(params.conversationId, params.userId)
  if (!canAccess) return null

  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      role: params.role === 'ASSISTANT' ? Role.ASSISTANT : Role.USER,
      content: params.content,
      trackerSchemaSnapshot: params.trackerSchemaSnapshot,
      managerData: sanitizeManagerData(params.managerData),
    },
  })

  return message
}
