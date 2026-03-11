import { z } from 'zod'
import { createEmptyTrackerSchema } from '@/app/components/tracker-display/tracker-editor/constants'
import { badRequest, jsonOk } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { createTrackerForUser } from '@/lib/repositories'

const createTrackerBodySchema = z
  .object({
    name: z.string().optional(),
    schema: z.unknown().optional(),
    new: z.boolean().optional(),
    projectId: z.string().optional(),
    moduleId: z.string().optional(),
    instance: z.enum(['SINGLE', 'MULTI']).optional(),
    versionControl: z.boolean().optional(),
  })
  .passthrough()

/**
 * POST /api/trackers
 * Create a tracker in the database.
 * Body: { name?, schema?, new?, projectId?, moduleId?, instance?, versionControl? }
 * - If new: true, creates a new tracker: use body.schema if valid, else empty schema; no schema required.
 * - Otherwise requires schema.
 * - instance defaults to SINGLE. Multi-instance trackers are stored as a single tracker schema.
 * - versionControl is only honoured for SINGLE instance (forced false for MULTI).
 */
export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const parsed = await request.json().catch(() => null)
  if (parsed == null) return badRequest('Invalid JSON body')

  const bodyResult = createTrackerBodySchema.safeParse(parsed)
  if (!bodyResult.success) return badRequest('Invalid JSON body')
  const body = bodyResult.data

  const isNew = body.new === true
  const schemaFromBody = body.schema
  const schema =
    isNew
      ? (typeof schemaFromBody === 'object' && schemaFromBody !== null
          ? (schemaFromBody as object)
          : (createEmptyTrackerSchema() as object))
      : schemaFromBody

  if (schema === undefined || typeof schema !== 'object' || schema === null) {
    return badRequest('Missing or invalid schema')
  }

  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : 'Untitled tracker'

  const instance = body.instance === 'MULTI' ? 'MULTI' : 'SINGLE'
  // Version control is only for single-instance trackers
  const versionControl = instance === 'SINGLE' ? (body.versionControl ?? false) : false

  const tracker = await createTrackerForUser({
    userId: authResult.user.id,
    name,
    schema: schema as object,
    projectId: typeof body.projectId === 'string' ? body.projectId.trim() : undefined,
    moduleId: typeof body.moduleId === 'string' ? body.moduleId.trim() : undefined,
    instance,
    versionControl,
  })

  return jsonOk(tracker)
}
