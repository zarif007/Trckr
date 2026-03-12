import { z } from 'zod'
import {
  validateGridDataSnapshot,
} from '@/lib/tracker-data'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import {
  deleteTrackerSnapshotForUser,
  getTrackerSnapshotForUser,
  updateTrackerSnapshotForUser,
} from '@/lib/repositories'
import type { GridDataSnapshot } from '@/lib/tracker-data'

const patchTrackerDataBodySchema = z
  .object({
    label: z.string().optional(),
    formStatus: z.string().nullable().optional(),
    data: z.unknown().optional(),
  })
  .passthrough()

/**
 * GET /api/trackers/[id]/data/[dataId]
 * Return a single TrackerData snapshot.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { dataId } = await readParams(params)
  const snapshotId = requireParam(dataId, 'data id')
  if (!snapshotId) return badRequest('Missing data id')

  const row = await getTrackerSnapshotForUser(snapshotId, authResult.user.id)
  if (!row) {
    return notFound('Tracker data not found')
  }

  return jsonOk(row)
}

/**
 * PATCH /api/trackers/[id]/data/[dataId]
 * Update label and/or data. Body: { label?: string, data?: GridDataSnapshot }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { dataId } = await readParams(params)
  const snapshotId = requireParam(dataId, 'data id')
  if (!snapshotId) return badRequest('Missing data id')

  const rawBody = await request.json().catch(() => null)
  if (rawBody == null) return badRequest('Invalid JSON body')
  const parsedBody = patchTrackerDataBodySchema.safeParse(rawBody)
  if (!parsedBody.success) return badRequest('Invalid JSON body')
  const body = parsedBody.data

  if (body.data !== undefined && !validateGridDataSnapshot(body.data)) {
    return badRequest('Invalid data: must be an object with array-of-objects values')
  }

  const updateBody: { label?: string; formStatus?: string | null; data?: GridDataSnapshot } = {}
  if (body.label !== undefined) updateBody.label = body.label
  if (body.formStatus !== undefined) updateBody.formStatus = body.formStatus
  if (body.data !== undefined) updateBody.data = body.data as GridDataSnapshot

  const updated = await updateTrackerSnapshotForUser(snapshotId, authResult.user.id, updateBody)
  if (!updated) {
    return notFound('Tracker data not found')
  }

  return jsonOk(updated)
}

/**
 * DELETE /api/trackers/[id]/data/[dataId]
 * Delete a TrackerData snapshot.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { dataId } = await readParams(params)
  const snapshotId = requireParam(dataId, 'data id')
  if (!snapshotId) return badRequest('Missing data id')

  const deleted = await deleteTrackerSnapshotForUser(snapshotId, authResult.user.id)
  if (!deleted) {
    return notFound('Tracker data not found')
  }

  return jsonOk({ deleted: true })
}
