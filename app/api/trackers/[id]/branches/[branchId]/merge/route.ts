import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/trackers/[id]/branches/[branchId]/merge
 * Merge a branch into main by copying its data to the main branch.
 * Marks the source branch as isMerged = true.
 * The main branch record is updated (not replaced) so its id remains stable.
 */
export async function POST(
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

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: { id: true, versionControl: true },
  })
  if (!tracker) return notFound('Tracker not found')
  if (!tracker.versionControl) return badRequest('Version control is not enabled for this tracker')

  const sourceBranch = await prisma.trackerData.findFirst({
    where: { id: resolvedBranchId, trackerSchemaId: trackerId },
  })
  if (!sourceBranch) return notFound('Branch not found')
  if (sourceBranch.branchName === 'main') return badRequest('Cannot merge main into itself')
  if (sourceBranch.isMerged) return badRequest('Branch is already merged')

  // Find the main branch
  const mainBranch = await prisma.trackerData.findFirst({
    where: { trackerSchemaId: trackerId, branchName: 'main', isMerged: false },
    orderBy: { createdAt: 'asc' },
  })
  if (!mainBranch) return notFound('Main branch not found')

  // Merge in a transaction: update main data + mark source as merged
  const [updatedMain] = await prisma.$transaction([
    prisma.trackerData.update({
      where: { id: mainBranch.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { data: sourceBranch.data as any },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.trackerData.update({
      where: { id: sourceBranch.id },
      data: { isMerged: true },
    }),
  ])

  return jsonOk({ main: updatedMain, merged: { id: sourceBranch.id, branchName: sourceBranch.branchName } })
}
