import { z } from 'zod'
import { jsonOk } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { createProjectForUser } from '@/lib/repositories'
import { getProjectsForUser } from '@/lib/dashboard-data'

const createProjectBodySchema = z
  .object({
    name: z.string().optional(),
  })
  .passthrough()

/**
 * GET /api/projects
 * Returns the current user's projects with modules as tree.
 */
export async function GET() {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const projects = await getProjectsForUser()
  return jsonOk(projects ?? [])
}

/**
 * POST /api/projects
 * Create a new project for the current user.
 * Body: { name?: string }
 */
export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const rawBody = await request.json().catch(() => ({}))
  const body = createProjectBodySchema.safeParse(rawBody)
  const input = body.success ? body.data : {}

  const name =
    typeof input.name === 'string' && input.name.trim()
      ? input.name.trim()
      : 'Untitled project'

  const project = await createProjectForUser(authResult.user.id, name)

  return jsonOk(project, { status: 201 })
}
