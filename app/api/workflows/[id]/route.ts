import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  jsonOk,
  badRequest,
  notFound,
  parseJsonBody,
  readParams,
  serverError,
} from "@/lib/api/http";
import {
  findWorkflowForUser,
  updateWorkflow,
  deleteWorkflowForUser,
} from "@/lib/repositories/workflow-repository";
import { workflowSchemaZod } from "@/lib/workflows/schema";

const updateWorkflowBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  schema: workflowSchemaZod.optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(context.params);
  if (!id) return badRequest("Missing workflow id");

  const workflow = await findWorkflowForUser(id, authResult.user.id);
  if (!workflow) return notFound("Workflow not found");

  return jsonOk({
    id: workflow.id,
    projectId: workflow.projectId,
    moduleId: workflow.moduleId,
    name: workflow.name,
    description: workflow.description,
    enabled: workflow.enabled,
    schema: workflow.schema,
    module: workflow.module ?? null,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(context.params);
  if (!id) return badRequest("Missing workflow id");

  const body = await parseJsonBody(request, updateWorkflowBody);
  if (!body.ok) return body.response;

  const existing = await findWorkflowForUser(id, authResult.user.id);
  if (!existing) return notFound("Workflow not found");

  const updated = await updateWorkflow({
    id,
    userId: authResult.user.id,
    data: body.data,
  });
  if (!updated) return serverError("Failed to update workflow");

  const workflow = await findWorkflowForUser(id, authResult.user.id);
  return jsonOk(workflow);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(context.params);
  if (!id) return badRequest("Missing workflow id");

  const deleted = await deleteWorkflowForUser(id, authResult.user.id);
  if (!deleted) return notFound("Workflow not found");

  return jsonOk({ deleted: true });
}
