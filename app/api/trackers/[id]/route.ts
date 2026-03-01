import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/trackers/[id]
 * Returns a single tracker schema by id if the user owns it (via project).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Missing tracker id' }, { status: 400 })
  }

  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id,
      project: { userId: session.user.id },
    },
  })

  if (!tracker) {
    return NextResponse.json({ error: 'Tracker not found' }, { status: 404 })
  }

  return NextResponse.json(tracker)
}

/**
 * PATCH /api/trackers/[id]
 * Update tracker name and/or schema. Body: { name?: string, schema?: object }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Missing tracker id' }, { status: 400 })
  }

  let body: { name?: string; schema?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id,
      project: { userId: session.user.id },
    },
  })

  if (!tracker) {
    return NextResponse.json({ error: 'Tracker not found' }, { status: 404 })
  }

  const updateData: { name?: string | null; schema?: object } = {}
  if (typeof body.name === 'string') {
    updateData.name = body.name.trim() || null
  }
  if (body.schema !== undefined && typeof body.schema === 'object' && body.schema !== null) {
    updateData.schema = body.schema as object
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(tracker)
  }

  const updated = await prisma.trackerSchema.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(updated)
}
