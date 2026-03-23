import { jsonOk, notFound, readParams, unauthorized } from '@/lib/api/http'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { buildFieldCatalog } from '@/lib/reports/field-catalog'
import { fingerprintFromCatalog } from '@/lib/reports/fingerprint'
import { getReportForUser } from '@/lib/reports/report-repository'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser()
  if (!auth.ok) return unauthorized()

  const { id } = await readParams(context.params)
  const report = await getReportForUser(id, auth.user.id)
  if (!report) return notFound('Report not found.')

  const catalog = buildFieldCatalog(report.trackerSchema.schema)
  const fingerprintNow = fingerprintFromCatalog(catalog)
  const def = report.definition
  const staleDefinition = Boolean(
    def?.schemaFingerprint &&
      def.schemaFingerprint !== fingerprintNow &&
      def.status === 'ready',
  )

  return jsonOk({
    id: report.id,
    name: report.name,
    projectId: report.projectId,
    moduleId: report.moduleId,
    trackerSchemaId: report.trackerSchemaId,
    trackerName: report.trackerSchema.name,
    projectName: report.project.name,
    moduleName: report.module?.name ?? null,
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
  })
}
