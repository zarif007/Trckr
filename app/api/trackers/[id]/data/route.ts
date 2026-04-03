import { z } from 'zod'
import {
 validateGridDataSnapshot,
} from '@/lib/tracker-data'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import {
 createTrackerSnapshotForUser,
 listTrackerSnapshotsForUser,
 upsertCurrentDataForUser,
} from '@/lib/repositories'

const createTrackerDataBodySchema = z
 .object({
 label: z.string().optional(),
 formStatus: z.string().nullable().optional(),
 data: z.unknown().optional(),
 branchName: z.string().optional(),
 basedOnId: z.string().optional(),
 })
 .passthrough()

/**
 * GET /api/trackers/[id]/data
 * List TrackerData snapshots for this tracker. Query: limit (default 20, max 100), offset (default 0).
 */
export async function GET(
 request: Request,
 { params }: { params: Promise<{ id: string }> }
) {
 const authResult = await requireAuthenticatedUser()
 if (!authResult.ok) return authResult.response

 const { id } = await readParams(params)
 const trackerId = requireParam(id, 'tracker id')
 if (!trackerId) return badRequest('Missing tracker id')

 const { searchParams } = new URL(request.url)
 const limitParam = searchParams.get('limit')
 const offsetParam = searchParams.get('offset')
 const limit = limitParam != null ? parseInt(limitParam, 10) : 20
 const offset = offsetParam != null ? parseInt(offsetParam, 10) : 0

 const result = await listTrackerSnapshotsForUser(trackerId, authResult.user.id, { limit, offset })
 if (!result) {
 return notFound('Tracker not found')
 }

 return jsonOk(result)
}

/**
 * POST /api/trackers/[id]/data
 * Create a new TrackerData snapshot/branch.
 * Body: { label?: string, data: GridDataSnapshot, branchName?: string, basedOnId?: string }
 * authorId is auto-set from the authenticated session.
 */
export async function POST(
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
 const parsedBody = createTrackerDataBodySchema.safeParse(rawBody)
 if (!parsedBody.success) return badRequest('Invalid JSON body')
 const body = parsedBody.data

 if (body.data === undefined) {
 return badRequest('Missing or invalid data')
 }
 if (!validateGridDataSnapshot(body.data)) {
 return badRequest('Invalid data: must be an object with array-of-objects values')
 }

 const tracker = await prisma.trackerSchema.findFirst({
 where: { id: trackerId, project: { userId: authResult.user.id } },
 select: { instance: true, versionControl: true },
 })
 if (!tracker) return notFound('Tracker not found')

 if (tracker.instance === 'SINGLE' && !tracker.versionControl) {
 const result = await upsertCurrentDataForUser(
 trackerId,
 authResult.user.id,
 body.data as Record<string, Array<Record<string, unknown>>>,
 body.formStatus,
 )
 if (!result) return notFound('Tracker not found')
 return jsonOk(result)
 }

 const created = await createTrackerSnapshotForUser(trackerId, authResult.user.id, {
 label: body.label,
 formStatus: body.formStatus,
 data: body.data,
 branchName: body.branchName,
 basedOnId: body.basedOnId,
 authorId: authResult.user.id,
 })
 if (!created) {
 return notFound('Tracker not found')
 }

 return jsonOk(created)
}
