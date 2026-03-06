import { z } from 'zod'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import {
  findTrackerByIdForUser,
  updateTrackerByIdForUser,
  deleteTrackerByIdForUser,
} from '@/lib/repositories'

const patchTrackerBodySchema = z
  .object({
    name: z.string().optional(),
    schema: z.unknown().optional(),
  })
  .passthrough()

/**
 * GET /api/trackers/[id]
 * Returns a single tracker schema by id if the user owns it (via project).
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

  const tracker = await findTrackerByIdForUser(trackerId, authResult.user.id)

  if (!tracker) {
    return notFound('Tracker not found')
  }

  return jsonOk(tracker)
}

/**
 * PATCH /api/trackers/[id]
 * Update tracker name and/or schema. Body: { name?: string, schema?: object }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  if (!trackerId) return badRequest('Missing tracker id')

  const rawBody = await request.json().catch(() => null)
  if (rawBody == null) return badRequest('Invalid JSON body')
  const parsedBody = patchTrackerBodySchema.safeParse(rawBody)
  if (!parsedBody.success) return badRequest('Invalid JSON body')
  const body = parsedBody.data

  const tracker = await findTrackerByIdForUser(trackerId, authResult.user.id)

  if (!tracker) {
    return notFound('Tracker not found')
  }

  const updateData: { name?: string | null; schema?: object } = {}
  if (typeof body.name === 'string') {
    updateData.name = body.name.trim() || null
  }
  if (body.schema !== undefined && typeof body.schema === 'object' && body.schema !== null) {
    updateData.schema = body.schema as object
  }

  if (Object.keys(updateData).length === 0) {
    return jsonOk(tracker)
  }

  const updated = await updateTrackerByIdForUser(trackerId, authResult.user.id, updateData)
  if (!updated) return notFound('Tracker not found')

  return jsonOk(updated)
}

/**
 * DELETE /api/trackers/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  if (!trackerId) return badRequest('Missing tracker id')

  const deleted = await deleteTrackerByIdForUser(trackerId, authResult.user.id)
  if (!deleted) return notFound('Tracker not found')

  return jsonOk({ deleted: true })
}
