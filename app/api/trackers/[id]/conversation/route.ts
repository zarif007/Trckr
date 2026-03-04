import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import type { Conversation, Message, Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'

/** Tracker with included conversations (and optionally messages) */
type TrackerWithConversation = NonNullable<
  Awaited<ReturnType<typeof prisma.trackerSchema.findFirst>>
> & {
  conversations: Array<Conversation & { messages?: Message[] }>
}

/**
 * GET /api/trackers/[id]/conversation
 * Returns the conversation and messages for this tracker (one conversation per tracker).
 * 404 if no conversation exists yet.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: trackerId } = await params
  if (!trackerId) {
    return NextResponse.json({ error: 'Missing tracker id' }, { status: 400 })
  }

  const tracker = (await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId: session.user.id },
    },
    include: {
      conversations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      },
    } as Prisma.TrackerSchemaInclude,
  })) as TrackerWithConversation | null

  if (!tracker) {
    return NextResponse.json({ error: 'Tracker not found' }, { status: 404 })
  }

  const conversation = tracker.conversations[0]
  if (!conversation) {
    return NextResponse.json({ error: 'No conversation yet' }, { status: 404 })
  }

  const messages = (conversation.messages ?? []).map((m: Message) => ({
    id: m.id,
    role: m.role === Role.USER ? 'user' : 'assistant',
    content: m.content,
    trackerData: m.trackerSchemaSnapshot as unknown,
    managerData: m.managerData as unknown,
    createdAt: m.createdAt,
  }))

  return NextResponse.json({
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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: trackerId } = await params
  if (!trackerId) {
    return NextResponse.json({ error: 'Missing tracker id' }, { status: 400 })
  }

  const tracker = (await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId: session.user.id },
    },
    include: {
      conversations: { orderBy: { createdAt: 'desc' }, take: 1 },
    } as Prisma.TrackerSchemaInclude,
  })) as TrackerWithConversation | null

  if (!tracker) {
    return NextResponse.json({ error: 'Tracker not found' }, { status: 404 })
  }

  let conversation = tracker.conversations[0]
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { trackerSchemaId: trackerId } as unknown as Prisma.ConversationUncheckedCreateInput,
    })
  }

  return NextResponse.json({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
  })
}
