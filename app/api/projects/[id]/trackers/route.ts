import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { listTrackerSchemasForProjectForUser } from '@/lib/repositories'

/**
 * GET /api/projects/[id]/trackers
 * List tracker schemas in the project (id + name) if the user owns the project.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const projectId = requireParam(id, 'project id')
  if (!projectId) return badRequest('Missing project id')

  const items = await listTrackerSchemasForProjectForUser(projectId, authResult.user.id)
  if (!items) {
    return notFound('Project not found')
  }

  return jsonOk({ items })
}
