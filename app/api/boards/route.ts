import { z } from "zod";

import {
  badRequest,
  jsonOk,
  parseJsonBody,
  unauthorized,
} from "@/lib/api/http";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { createBoard } from "@/lib/boards/board-repository";

const createBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  projectId: z.string().min(1),
  moduleId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const parsed = await parseJsonBody(request, createBodySchema);
  if (!parsed.ok) return parsed.response;

  const { name, projectId, moduleId } = parsed.data;
  const board = await createBoard({
    userId: auth.user.id,
    projectId,
    moduleId: moduleId ?? null,
    name: name.trim(),
  });
  if (!board) {
    return badRequest("Project not found or module does not belong to project.");
  }

  return jsonOk({ id: board.id });
}
