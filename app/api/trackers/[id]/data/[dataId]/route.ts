import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import {
  getTrackerData,
  updateTrackerData,
  deleteTrackerData,
  validateGridDataSnapshot,
} from '@/lib/tracker-data'

/**
 * GET /api/trackers/[id]/data/[dataId]
 * Return a single TrackerData snapshot.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dataId } = await params
  if (!dataId) {
    return NextResponse.json({ error: 'Missing data id' }, { status: 400 })
  }

  const row = await getTrackerData(dataId, session.user.id)
  if (!row) {
    return NextResponse.json({ error: 'Tracker data not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}

/**
 * PATCH /api/trackers/[id]/data/[dataId]
 * Update label and/or data. Body: { label?: string, data?: GridDataSnapshot }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dataId } = await params
  if (!dataId) {
    return NextResponse.json({ error: 'Missing data id' }, { status: 400 })
  }

  let body: { label?: string; data?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.data !== undefined && !validateGridDataSnapshot(body.data)) {
    return NextResponse.json(
      { error: 'Invalid data: must be an object with array-of-objects values' },
      { status: 400 }
    )
  }

  const updateBody: { label?: string; data?: import('@/lib/tracker-data/types').GridDataSnapshot } = {}
  if (body.label !== undefined) updateBody.label = body.label
  if (body.data !== undefined) updateBody.data = body.data as import('@/lib/tracker-data/types').GridDataSnapshot

  const updated = await updateTrackerData(dataId, session.user.id, updateBody)
  if (!updated) {
    return NextResponse.json({ error: 'Tracker data not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

/**
 * DELETE /api/trackers/[id]/data/[dataId]
 * Delete a TrackerData snapshot.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dataId } = await params
  if (!dataId) {
    return NextResponse.json({ error: 'Missing data id' }, { status: 400 })
  }

  const deleted = await deleteTrackerData(dataId, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Tracker data not found' }, { status: 404 })
  }

  return NextResponse.json({ deleted: true })
}
