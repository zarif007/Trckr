import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'

/**
 * POST /api/conversations/[id]/messages
 * Append a message to a conversation. Body: { role: 'USER' | 'ASSISTANT', content: string, trackerSchemaSnapshot?: object, managerData?: object }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: conversationId } = await params
  if (!conversationId) {
    return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 })
  }

  let body: { role?: string; content?: string; trackerSchemaSnapshot?: unknown; managerData?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const role = body.role === 'ASSISTANT' ? Role.ASSISTANT : Role.USER
  const content = typeof body.content === 'string' ? body.content : ''
  const trackerSchemaSnapshot =
    body.trackerSchemaSnapshot != null && typeof body.trackerSchemaSnapshot === 'object'
      ? (body.trackerSchemaSnapshot as object)
      : undefined
  const managerData =
    body.managerData != null && typeof body.managerData === 'object'
      ? (body.managerData as object)
      : undefined

  const rows = await prisma.$queryRaw<
    [{ userId: string }]
  >`SELECT p."userId" FROM "Conversation" c
    INNER JOIN "TrackerSchema" t ON t.id = c."trackerSchemaId"
    INNER JOIN "Project" p ON p.id = t."projectId"
    WHERE c.id = ${conversationId} LIMIT 1`
  if (!rows.length || rows[0].userId !== session.user.id) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      role,
      content: content ?? '',
      trackerSchemaSnapshot: trackerSchemaSnapshot ?? undefined,
      managerData: managerData ?? undefined,
    },
  })

  return NextResponse.json({
    id: message.id,
    role: message.role === Role.USER ? 'user' : 'assistant',
    content: message.content,
    trackerSchemaSnapshot: message.trackerSchemaSnapshot,
    managerData: message.managerData,
    createdAt: message.createdAt,
  })
}
