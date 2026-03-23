import { badRequest, jsonOk, unauthorized } from '@/lib/api/http'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { listTrackersForScope } from '@/lib/reports/report-repository'

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser()
  if (!auth.ok) return unauthorized()

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')?.trim()
  const moduleId = searchParams.get('moduleId')?.trim()
  if (!projectId) {
    return badRequest('projectId query parameter is required.')
  }

  const trackers = await listTrackersForScope(
    auth.user.id,
    projectId,
    moduleId || undefined,
  )
  if (!trackers) {
    return badRequest('Project not found.')
  }

  return jsonOk({ trackers })
}
