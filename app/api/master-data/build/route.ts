import { z } from 'zod'
import { badRequest, jsonOk, notFound } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { applyMasterDataBindings } from '@/lib/master-data/builder'
import { resolveMasterDataDefaultScope } from '@/lib/master-data/resolve-default'
import { normalizeMasterDataScope } from '@/lib/master-data-scope'
import type { MasterDataTrackerSpec } from '@/lib/schemas/multi-agent'

const bodySchema = z.object({
  tracker: z.unknown(),
  trackerSchemaId: z.string().optional(),
  projectId: z.string().optional(),
  moduleId: z.string().optional(),
  masterDataScope: z.enum(['tracker', 'module', 'project']).optional(),
  masterDataTrackers: z.array(z.record(z.string(), z.any())).optional(),
}).passthrough()

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const raw = await request.json().catch(() => null)
  if (!raw) return badRequest('Invalid JSON body')
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return badRequest('Invalid JSON body')
  const body = parsed.data

  if (!body.tracker || typeof body.tracker !== 'object' || Array.isArray(body.tracker)) {
    return badRequest('Missing tracker payload')
  }

  let projectId = body.projectId?.trim() || null
  let moduleId = body.moduleId?.trim() || null

  if (body.trackerSchemaId) {
    const trackerRow = await prisma.trackerSchema.findFirst({
      where: { id: body.trackerSchemaId, project: { userId: authResult.user.id } },
      select: { projectId: true, moduleId: true },
    })
    if (!trackerRow) return notFound('Tracker not found')
    projectId = trackerRow.projectId
    moduleId = trackerRow.moduleId
  }

  if (!projectId) return badRequest('Missing project context')

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: authResult.user.id },
    select: { id: true },
  })
  if (!project) return notFound('Project not found')

  if (moduleId) {
    const mod = await prisma.module.findFirst({
      where: { id: moduleId, projectId: project.id, project: { userId: authResult.user.id } },
      select: { id: true },
    })
    if (!mod) return notFound('Module not found')
  }

  const defaultScopeResolution = await resolveMasterDataDefaultScope({
    projectId: project.id,
    userId: authResult.user.id,
    moduleId,
  })
  const masterDataScope =
    normalizeMasterDataScope(body.masterDataScope) ??
    normalizeMasterDataScope((body.tracker as Record<string, unknown>).masterDataScope) ??
    defaultScopeResolution.inheritedDefault ??
    'tracker'

  const result = await applyMasterDataBindings({
    tracker: body.tracker as Record<string, unknown>,
    scope: masterDataScope,
    masterDataTrackers: body.masterDataTrackers as MasterDataTrackerSpec[] | undefined,
    projectId: project.id,
    moduleId,
    userId: authResult.user.id,
  })

  return jsonOk({ tracker: result.tracker })
}
