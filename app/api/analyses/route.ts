import { z } from 'zod'

import {
  badRequest,
  jsonOk,
  parseJsonBody,
  unauthorized,
} from '@/lib/api/http'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { createAnalysis } from '@/lib/analysis/analysis-repository'

const createBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  projectId: z.string().min(1),
  moduleId: z.string().optional().nullable(),
  trackerSchemaId: z.string().min(1),
})

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser()
  if (!auth.ok) return unauthorized()

  const parsed = await parseJsonBody(request, createBodySchema)
  if (!parsed.ok) return parsed.response

  const { name, projectId, moduleId, trackerSchemaId } = parsed.data
  const analysis = await createAnalysis({
    userId: auth.user.id,
    projectId,
    moduleId: moduleId ?? null,
    name: name.trim(),
    trackerSchemaId,
  })
  if (!analysis) {
    return badRequest('Tracker not found in this project, or module mismatch.')
  }

  return jsonOk({ id: analysis.id })
}
