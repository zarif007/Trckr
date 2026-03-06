import { z } from 'zod'
import { jsonOk, notFound, readParams, parseJsonBody } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import {
  findModuleByIdForUser,
  updateModuleForUser,
  deleteModuleForUser,
} from '@/lib/repositories'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)

  const mod = await findModuleByIdForUser(id, authResult.user.id)
  if (!mod) return notFound('Module not found')

  return jsonOk(mod)
}

const updateModuleBody = z.object({
  name: z.string().min(1).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const body = await parseJsonBody(request, updateModuleBody)
  if (!body.ok) return body.response

  const mod = await updateModuleForUser(id, authResult.user.id, body.data)
  if (!mod) return notFound('Module not found')

  return jsonOk(mod)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)

  const mod = await deleteModuleForUser(id, authResult.user.id)
  if (!mod) return notFound('Module not found')

  return jsonOk({ deleted: true })
}
