import { z } from 'zod'
import { jsonOk, notFound, parseJsonBody } from '@/lib/api'
import { readParams } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { addModuleFile } from '@/lib/repositories'

const addFileBody = z.object({
  type: z.enum(['TEAMS', 'SETTINGS', 'RULES', 'CONNECTIONS']),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const body = await parseJsonBody(request, addFileBody)
  if (!body.ok) return body.response

  const file = await addModuleFile(id, authResult.user.id, body.data.type)
  if (!file) return notFound('Module not found')

  return jsonOk(file, { status: 201 })
}
