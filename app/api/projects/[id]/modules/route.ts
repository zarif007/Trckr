import { z } from 'zod'
import { jsonOk, notFound, readParams, parseJsonBody } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { findProjectByIdForUser } from '@/lib/repositories'
import {
  listModulesForProject,
  createModuleForProject,
} from '@/lib/repositories'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)

  const project = await findProjectByIdForUser(id, authResult.user.id)
  if (!project) return notFound('Project not found')

  const modules = await listModulesForProject(id, authResult.user.id)
  return jsonOk(modules)
}

const createModuleBody = z.object({
  name: z.string().min(1, 'Module name is required'),
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

  const mod = await createModuleForProject(id, authResult.user.id, body.data.name)
  if (!mod) return notFound('Project not found')

  return jsonOk(mod, { status: 201 })
}
