import { jsonOk, notFound, readParams } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { findProjectByIdForUser } from '@/lib/repositories'

/**
 * GET /api/projects/[id]
 * Returns a single project with tracker schemas (only if owned by current user).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)

  const project = await findProjectByIdForUser(id, authResult.user.id)

  if (!project) {
    return notFound('Not found')
  }

  return jsonOk(project)
}
