import { badRequest, jsonOk, notFound, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { resolveMasterDataDefaultScope } from '@/lib/master-data/resolve-default'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const authResult = await requireAuthenticatedUser()
 if (!authResult.ok) return authResult.response

 const { id } = await readParams(params)
 const projectId = requireParam(id, 'project id')
 if (!projectId) return badRequest('Missing project id')

 const project = await prisma.project.findFirst({
 where: { id: projectId, userId: authResult.user.id },
 select: { id: true, settings: true },
 })
 if (!project) return notFound('Project not found')

 const url = new URL(request.url)
 const rawModuleId = url.searchParams.get('moduleId')
 const moduleId = rawModuleId && rawModuleId.trim().length ? rawModuleId.trim() : null

 let ownerTarget:
 | { kind: 'module'; moduleId: string; projectId: string }
 | { kind: 'project'; projectId: string }
 let currentModuleId: string | null = null

 if (moduleId) {
 const moduleRow = await prisma.module.findFirst({
 where: { id: moduleId, projectId: project.id, project: { userId: authResult.user.id } },
 select: { id: true, parentId: true, settings: true },
 })
 if (!moduleRow) return notFound('Module not found')
 ownerTarget = { kind: 'module', moduleId: moduleRow.id, projectId: project.id }
 currentModuleId = moduleRow.id
 } else {
 ownerTarget = { kind: 'project', projectId: project.id }
 }

 const resolution = await resolveMasterDataDefaultScope({
 projectId: project.id,
 userId: authResult.user.id,
 moduleId: currentModuleId,
 })

 return jsonOk({
 inheritedDefault: resolution.inheritedDefault,
 inheritedSource: resolution.inheritedSource,
 ...(resolution.inheritedSourceModuleId
 ? { inheritedSourceModuleId: resolution.inheritedSourceModuleId }
 : {}),
 ownerTarget,
 })
}
