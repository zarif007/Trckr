import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import {
  createTrackerData,
  listTrackerData,
  validateGridDataSnapshot,
} from '@/lib/tracker-data'

/**
 * GET /api/trackers/[id]/data
 * List TrackerData snapshots for this tracker. Query: limit (default 20, max 100), offset (default 0).
 */
export async function GET(
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

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  const limit = limitParam != null ? parseInt(limitParam, 10) : 20
  const offset = offsetParam != null ? parseInt(offsetParam, 10) : 0

  const result = await listTrackerData(id, session.user.id, { limit, offset })
  if (!result) {
    return NextResponse.json({ error: 'Tracker not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}

/**
 * POST /api/trackers/[id]/data
 * Create a new TrackerData snapshot. Body: { label?: string, data: GridDataSnapshot }
 */
export async function POST(
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

  let body: { label?: string; data?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.data === undefined) {
    return NextResponse.json(
      { error: 'Missing or invalid data' },
      { status: 400 }
    )
  }
  if (!validateGridDataSnapshot(body.data)) {
    return NextResponse.json(
      { error: 'Invalid data: must be an object with array-of-objects values' },
      { status: 400 }
    )
  }

  const created = await createTrackerData(id, session.user.id, {
    label: body.label,
    data: body.data,
  })
  if (!created) {
    return NextResponse.json({ error: 'Tracker not found' }, { status: 404 })
  }

  return NextResponse.json(created)
}
