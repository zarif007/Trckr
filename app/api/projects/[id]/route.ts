import { z } from "zod";
import { jsonOk, notFound, readParams, parseJsonBody } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  findProjectByIdForUser,
  updateProjectForUser,
  deleteProjectForUser,
} from "@/lib/repositories";
import { getProjectForUser } from "@/lib/dashboard-data";

const updateProjectBody = z.object({
  name: z.string().min(1, "Project name is required"),
});

/**
 * GET /api/projects/[id]
 * Returns a single project with modules as tree (only if owned by current user).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);

  const project = await getProjectForUser(id);

  if (!project) {
    return notFound("Not found");
  }

  return jsonOk(project);
}

/**
 * PATCH /api/projects/[id]
 * Update project name.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);
  const body = await parseJsonBody(request, updateProjectBody);
  if (!body.ok) return body.response;

  const project = await updateProjectForUser(id, authResult.user.id, body.data);
  if (!project) return notFound("Project not found");

  return jsonOk(project);
}

/**
 * DELETE /api/projects/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);

  const deleted = await deleteProjectForUser(id, authResult.user.id);
  if (!deleted) return notFound("Project not found");

  return jsonOk({ deleted: true });
}
