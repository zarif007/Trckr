import { z } from 'zod'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { validateGridDataSnapshot } from '@/lib/tracker-data'

const updateBranchBodySchema = z.object({
  data: z.unknown().optional(),
  label: z.string().optional(),
  formStatus: z.string().nullable().optional(),
})

/**
 * GET /api/trackers/[id]/branches/[branchId]
 * Get a single branch by id.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id, branchId } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  const resolvedBranchId = requireParam(branchId, 'branch id')
  if (!trackerId) return badRequest('Missing tracker id')
  if (!resolvedBranchId) return badRequest('Missing branch id')

  const branch = await prisma.trackerData.findFirst({
    where: {
      id: resolvedBranchId,
      trackerSchemaId: trackerId,
      trackerSchema: { project: { userId: authResult.user.id } },
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  })
  if (!branch) return notFound('Branch not found')

  return jsonOk(branch)
}

/**
 * PATCH /api/trackers/[id]/branches/[branchId]
 * Update branch data and/or label (saves changes to an existing branch).
 * Body: { data?: GridDataSnapshot, label?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id, branchId } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  const resolvedBranchId = requireParam(branchId, 'branch id')
  if (!trackerId) return badRequest('Missing tracker id')
  if (!resolvedBranchId) return badRequest('Missing branch id')

  const rawBody = await request.json().catch(() => null)
  if (rawBody == null) return badRequest('Invalid JSON body')
  const parsedBody = updateBranchBodySchema.safeParse(rawBody)
  if (!parsedBody.success) return badRequest(parsedBody.error.message)
  const body = parsedBody.data

  const branch = await prisma.trackerData.findFirst({
    where: {
      id: resolvedBranchId,
      trackerSchemaId: trackerId,
      trackerSchema: { project: { userId: authResult.user.id } },
    },
  })
  if (!branch) return notFound('Branch not found')
  if (branch.isMerged) return badRequest('Cannot update a merged branch')

  const updateData: { data?: object; label?: string | null; formStatus?: string | null } = {}
  if (body.data !== undefined) {
    if (!validateGridDataSnapshot(body.data)) {
      return badRequest('Invalid data: must be an object with array-of-objects values')
    }
    updateData.data = body.data as object
  }
  if (body.label !== undefined) {
    updateData.label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : null
  }
  if (body.formStatus !== undefined) {
    updateData.formStatus = typeof body.formStatus === 'string' ? body.formStatus : null
  }

  if (Object.keys(updateData).length === 0) return jsonOk(branch)

  const updated = await prisma.trackerData.update({
    where: { id: resolvedBranchId },
    data: updateData,
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  })

  return jsonOk(updated)
}
