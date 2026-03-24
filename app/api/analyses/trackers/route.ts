import { badRequest, jsonOk, unauthorized } from '@/lib/api/http'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { listTrackersForScope } from '@/lib/insights-query/tracker-list'

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser()
  if (!auth.ok) return unauthorized()

  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')?.trim()
  if (!projectId) {
    return badRequest('projectId is required.')
  }
  const moduleIdRaw = url.searchParams.get('moduleId')
  const moduleId = moduleIdRaw === null ? undefined : moduleIdRaw || null

  const trackers = await listTrackersForScope(auth.user.id, projectId, moduleId)
  if (!trackers) {
    return badRequest('Project not found.')
  }

  return jsonOk({ trackers })
}
