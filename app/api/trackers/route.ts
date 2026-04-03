import { z } from 'zod'
import { Prisma, TrackerSchemaType } from '@prisma/client'
import { createEmptyTrackerSchema } from '@/app/components/tracker-display/tracker-editor/constants'
import { badRequest, jsonOk } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { createTrackerForUser, updateTrackerByIdForUser } from '@/lib/repositories'
import { resolveSelfBindings } from '@/lib/binding'
import { prisma } from '@/lib/db'
import { normalizeMasterDataScope, type MasterDataScope } from '@/lib/master-data-scope'

const createTrackerBodySchema = z
 .object({
 name: z.string().optional(),
 schema: z.unknown().optional(),
 new: z.boolean().optional(),
 projectId: z.string().optional(),
 moduleId: z.string().optional(),
 instance: z.enum(['SINGLE', 'MULTI']).optional(),
 versionControl: z.boolean().optional(),
 autoSave: z.boolean().optional(),
 masterDataScope: z.enum(['tracker', 'module', 'project']).optional(),
 setMasterDataDefaultForOwner: z.boolean().optional(),
 updateMasterDataDefaultForOwner: z.boolean().optional(),
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
 const requestedScope = normalizeMasterDataScope(body.masterDataScope) ?? 'tracker'
 const schema =
 isNew
 ? (typeof schemaFromBody === 'object' && schemaFromBody !== null
 ? { ...(schemaFromBody as Record<string, unknown>), masterDataScope: requestedScope }
 : ({ ...createEmptyTrackerSchema(), masterDataScope: requestedScope } as object))
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
 // Auto-save is only for single-instance trackers without version control
 const autoSave = instance === 'SINGLE' && !versionControl ? (body.autoSave ?? true) : false

 let tracker = await createTrackerForUser({
 userId: authResult.user.id,
 name,
 schema: schema as object,
 projectId: typeof body.projectId === 'string' ? body.projectId.trim() : undefined,
 moduleId: typeof body.moduleId === 'string' ? body.moduleId.trim() : undefined,
 instance,
 versionControl,
 autoSave,
 type: TrackerSchemaType.GENERAL,
 })

 const resolvedSchema = resolveSelfBindings(tracker.schema as Record<string, unknown>, tracker.id)
 if (resolvedSchema !== tracker.schema) {
 const updated = await updateTrackerByIdForUser(tracker.id, authResult.user.id, {
 schema: resolvedSchema as object,
 })
 if (updated) tracker = updated
 }

 const shouldPersistDefault =
 body.setMasterDataDefaultForOwner === true || body.updateMasterDataDefaultForOwner === true
 if (shouldPersistDefault) {
 const nextScope: MasterDataScope = requestedScope
 const nextSettings = (settings: unknown): Prisma.InputJsonValue => {
 if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
 return { masterDataDefaultScope: nextScope }
 }
 return {
 ...(settings as Record<string, Prisma.InputJsonValue>),
 masterDataDefaultScope: nextScope,
 }
 }

 if (tracker.moduleId) {
 const mod = await prisma.module.findFirst({
 where: { id: tracker.moduleId, projectId: tracker.projectId, project: { userId: authResult.user.id } },
 select: { id: true, settings: true },
 })
 if (mod) {
 await prisma.module.update({
 where: { id: mod.id },
 data: { settings: nextSettings(mod.settings) },
 })
 }
 } else {
 const project = await prisma.project.findFirst({
 where: { id: tracker.projectId, userId: authResult.user.id },
 select: { id: true, settings: true },
 })
 if (project) {
 await prisma.project.update({
 where: { id: project.id },
 data: { settings: nextSettings(project.settings) },
 })
 }
 }
 }

 return jsonOk(tracker)
}
