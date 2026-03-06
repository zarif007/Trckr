import { z } from 'zod'
import { jsonOk, notFound, readParams, parseJsonBody } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { findModuleFileForUser, updateModuleFileForUser } from '@/lib/repositories'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { fileId } = await readParams(params)

  const file = await findModuleFileForUser(fileId, authResult.user.id)
  if (!file) return notFound('File not found')

  return jsonOk(file)
}

const updateFileBody = z.object({
  content: z.unknown(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { fileId } = await readParams(params)
  const body = await parseJsonBody(request, updateFileBody)
  if (!body.ok) return body.response

  const file = await updateModuleFileForUser(fileId, authResult.user.id, body.data.content)
  if (!file) return notFound('File not found')

  return jsonOk(file)
}
