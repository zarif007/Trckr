import { z } from 'zod'

import {
 badRequest,
 jsonOk,
 notFound,
 parseJsonBody,
 readParams,
 requireParam,
 unauthorized,
} from '@/lib/api/http'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { parseAnalysisDocument } from '@/lib/analysis/analysis-schemas'
import {
 deleteAnalysisForUser,
 getAnalysisForUser,
 updateAnalysisNameForUser,
} from '@/lib/analysis/analysis-repository'
import { buildFieldCatalog } from '@/lib/insights-query/field-catalog'
import { fingerprintFromCatalog } from '@/lib/insights-query/fingerprint'
import { parseQueryPlan } from '@/lib/insights-query/schemas'

const patchBodySchema = z.object({
 name: z.string(),
})

export async function GET(
 _request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const auth = await requireAuthenticatedUser()
 if (!auth.ok) return unauthorized()

 const { id } = await readParams(context.params)
 const analysis = await getAnalysisForUser(id, auth.user.id)
 if (!analysis) return notFound('Analysis not found.')

 const catalog = buildFieldCatalog(analysis.trackerSchema.schema)
 const fingerprintNow = fingerprintFromCatalog(catalog)
 const def = analysis.definition
 const staleDefinition = Boolean(
 def?.schemaFingerprint &&
 def.schemaFingerprint !== fingerprintNow &&
 def.status === 'ready',
 )

 const fieldCatalogEntries = catalog.fields.map((f) => ({
 fieldId: f.fieldId,
 label: f.label,
 gridId: f.gridId,
 gridName: f.gridName,
 dataType: f.dataType,
 }))

 const document =
 def?.status === 'ready' && def.document != null
 ? parseAnalysisDocument(def.document)
 : null

 const recipe =
 def?.status === 'ready' ? parseQueryPlan(def.queryPlan) : null

 return jsonOk({
 id: analysis.id,
 name: analysis.name,
 projectId: analysis.projectId,
 moduleId: analysis.moduleId,
 trackerSchemaId: analysis.trackerSchemaId,
 trackerName: analysis.trackerSchema.name,
 projectName: analysis.project.name,
 moduleName: analysis.module?.name ?? null,
 definition: def
 ? {
 userPrompt: def.userPrompt,
 status: def.status,
 schemaFingerprint: def.schemaFingerprint,
 readyAt: def.readyAt?.toISOString() ?? null,
 lastError: def.lastError,
 }
 : null,
 staleDefinition,
 fingerprintNow,
 fieldCatalog: fieldCatalogEntries,
 document,
 recipe: recipe != null ? { queryPlan: recipe } : null,
 })
}

export async function PATCH(
 request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const auth = await requireAuthenticatedUser()
 if (!auth.ok) return unauthorized()

 const { id } = await readParams(context.params)
 const analysisId = requireParam(id, 'analysis id')
 if (!analysisId) return badRequest('Missing analysis id')

 const parsed = await parseJsonBody(request, patchBodySchema)
 if (!parsed.ok) return parsed.response

 const updated = await updateAnalysisNameForUser(
 analysisId,
 auth.user.id,
 parsed.data.name,
 )
 if (!updated) return notFound('Analysis not found.')

 return jsonOk({
 id: updated.id,
 name: updated.name,
 moduleId: updated.moduleId,
 updatedAt: updated.updatedAt.toISOString(),
 })
}

export async function DELETE(
 _request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const auth = await requireAuthenticatedUser()
 if (!auth.ok) return unauthorized()

 const { id } = await readParams(context.params)
 const analysisId = requireParam(id, 'analysis id')
 if (!analysisId) return badRequest('Missing analysis id')

 const deleted = await deleteAnalysisForUser(analysisId, auth.user.id)
 if (!deleted) return notFound('Analysis not found.')

 return jsonOk({ ok: true })
}
