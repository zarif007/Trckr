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
