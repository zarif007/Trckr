import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { jsonOk, badRequest, parseJsonBody } from "@/lib/api/http";
import {
  createWorkflow,
  listWorkflowsForProject,
} from "@/lib/repositories/workflow-repository";
import { workflowSchemaZod } from "@/lib/workflows/schema";

const createWorkflowBody = z.object({
  projectId: z.string(),
  moduleId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  schema: workflowSchemaZod,
});

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const body = await parseJsonBody(request, createWorkflowBody);
  if (!body.ok) return body.response;

  const result = await createWorkflow({
    ...body.data,
    userId: authResult.user.id,
  });

  if (!result.ok) return badRequest(result.error);

  const workflow = await listWorkflowsForProject(
    body.data.projectId,
    authResult.user.id,
  );
  const created = workflow.find((w) => w.id === result.id);
  return jsonOk(created, { status: 201 });
}

export async function GET(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const projectId = request.headers.get("x-project-id");
  if (!projectId) return badRequest("x-project-id header required");

  const workflows = await listWorkflowsForProject(
    projectId,
    authResult.user.id,
  );
  return jsonOk(workflows);
}
