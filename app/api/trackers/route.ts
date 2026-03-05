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
  })
  .passthrough()

/**
 * POST /api/trackers
 * Create a tracker in the database.
 * Body: { name?: string, schema?: object, new?: boolean, projectId?: string }
 * - If new: true, creates a new tracker: use body.schema if valid, else empty schema; no schema required.
 * - Otherwise requires schema. Uses projectId if provided and valid, else user's first project or creates "My Project".
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

  const tracker = await createTrackerForUser({
    userId: authResult.user.id,
    name,
    schema: schema as object,
    projectId: typeof body.projectId === 'string' ? body.projectId.trim() : undefined,
  })

  return jsonOk(tracker)
}
