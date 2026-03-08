import { z } from 'zod'
import { jsonOk, notFound, readParams, parseJsonBody } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { createModuleForProject } from '@/lib/repositories'
import { getProjectForUser } from '@/lib/dashboard-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)

  const project = await getProjectForUser(id)
  if (!project) return notFound('Project not found')

  return jsonOk(project.modules)
}

const createModuleBody = z.object({
  name: z.string().min(1, 'Module name is required'),
  parentId: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const body = await parseJsonBody(request, createModuleBody)
  if (!body.ok) return body.response

  const parentId =
    typeof body.data.parentId === 'string' && body.data.parentId.trim()
      ? body.data.parentId.trim()
      : undefined
  const mod = await createModuleForProject(
    id,
    authResult.user.id,
    body.data.name,
    parentId,
  )
  if (!mod) return notFound('Project not found')

  return jsonOk(mod, { status: 201 })
}
