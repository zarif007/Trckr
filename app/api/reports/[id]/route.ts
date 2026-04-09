import { z } from "zod";
import {
  badRequest,
  jsonOk,
  notFound,
  parseJsonBody,
  readParams,
  requireParam,
  unauthorized,
} from "@/lib/api/http";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  buildFieldCatalogFromNormalized,
  type FieldCatalog,
} from "@/lib/insights-query/field-catalog";
import { fingerprintFromCatalog } from "@/lib/insights-query/fingerprint";
import { parseFormatterPlan, parseQueryPlan } from "@/lib/reports/ast-schemas";
import {
  deleteReportForUser,
  getReportForUser,
  updateReportNameForUser,
} from "@/lib/reports/report-repository";

const patchReportBodySchema = z.object({
  name: z.string(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const { id } = await readParams(context.params);
  const report = await getReportForUser(id, auth.user.id);
  if (!report) return notFound("Report not found.");

  const catalog: FieldCatalog = buildFieldCatalogFromNormalized(
    report.trackerSchema,
  );
  const fingerprintNow = fingerprintFromCatalog(catalog);
  const def = report.definition;
  const staleDefinition = Boolean(
    def?.schemaFingerprint &&
    def.schemaFingerprint !== fingerprintNow &&
    def.status === "ready",
  );

  const parsedPlan =
    def?.status === "ready" ? parseQueryPlan(def.queryPlan) : null;
  const parsedFormatter =
    def?.status === "ready" && def.formatterPlan
      ? parseFormatterPlan(def.formatterPlan)
      : null;
  const formatterOnlyGroupBy = Boolean(
    parsedPlan &&
    !parsedPlan.aggregate &&
    parsedFormatter?.ops.some((op) => op.op === "group_by"),
  );

  const fieldCatalogEntries = catalog.fields.map((f) => ({
    fieldId: f.fieldId,
    label: f.label,
    gridId: f.gridId,
    gridName: f.gridName,
    dataType: f.dataType,
  }));

  return jsonOk({
    id: report.id,
    name: report.name,
    projectId: report.projectId,
    moduleId: report.moduleId,
    trackerSchemaId: report.trackerSchemaId,
    trackerInstance: report.trackerSchema.instance,
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
    fieldCatalog: fieldCatalogEntries,
    recipe:
      parsedPlan != null
        ? {
            queryPlan: parsedPlan,
            formatterOnlyGroupBy,
          }
        : null,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const { id } = await readParams(context.params);
  const reportId = requireParam(id, "report id");
  if (!reportId) return badRequest("Missing report id");

  const parsed = await parseJsonBody(request, patchReportBodySchema);
  if (!parsed.ok) return parsed.response;

  const updated = await updateReportNameForUser(
    reportId,
    auth.user.id,
    parsed.data.name,
  );
  if (!updated) return notFound("Report not found.");

  return jsonOk({
    id: updated.id,
    name: updated.name,
    moduleId: updated.moduleId,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const { id } = await readParams(context.params);
  const reportId = requireParam(id, "report id");
  if (!reportId) return badRequest("Missing report id");

  const deleted = await deleteReportForUser(reportId, auth.user.id);
  if (!deleted) return notFound("Report not found.");

  return jsonOk({ ok: true });
}
