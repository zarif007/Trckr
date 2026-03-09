import { z } from 'zod'
import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

const createBranchBodySchema = z.object({
  branchName: z.string().min(1),
  basedOnId: z.string(),
  label: z.string().optional(),
})

/**
 * GET /api/trackers/[id]/branches
 * List all branches (TrackerData records) for a version-controlled tracker.
 * Returns branches ordered by createdAt desc with author info.
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

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: { id: true, versionControl: true },
  })
  if (!tracker) return notFound('Tracker not found')
  if (!tracker.versionControl) return badRequest('Version control is not enabled for this tracker')

  const branches = await prisma.trackerData.findMany({
    where: { trackerSchemaId: trackerId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  })

  return jsonOk({ branches })
}

/**
 * POST /api/trackers/[id]/branches
 * Create a new branch from an existing TrackerData (basedOnId).
 * Body: { branchName: string, basedOnId: string, label?: string }
 * Copies data from basedOnId and creates a new TrackerData with the given branch name.
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
  const parsedBody = createBranchBodySchema.safeParse(rawBody)
  if (!parsedBody.success) return badRequest(parsedBody.error.message)
  const body = parsedBody.data

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: { id: true, versionControl: true },
  })
  if (!tracker) return notFound('Tracker not found')
  if (!tracker.versionControl) return badRequest('Version control is not enabled for this tracker')

  // Check branch name doesn't already exist (excluding merged branches)
  const existingBranch = await prisma.trackerData.findFirst({
    where: {
      trackerSchemaId: trackerId,
      branchName: body.branchName,
      isMerged: false,
    },
  })
  if (existingBranch) return badRequest(`Branch "${body.branchName}" already exists`)

  // Fetch base snapshot data
  const basedOn = await prisma.trackerData.findFirst({
    where: { id: body.basedOnId, trackerSchemaId: trackerId },
  })
  if (!basedOn) return notFound('Base branch not found')

  const newBranch = await prisma.trackerData.create({
    data: {
      trackerSchemaId: trackerId,
      branchName: body.branchName,
      label: body.label ?? null,
      data: basedOn.data ?? {},
      authorId: authResult.user.id,
      basedOnId: body.basedOnId,
      isMerged: false,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  })

  return jsonOk(newBranch)
}
