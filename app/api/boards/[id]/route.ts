import { z } from "zod";

import {
  badRequest,
  jsonOk,
  notFound,
  parseJsonBody,
  readParams,
  unauthorized,
} from "@/lib/api/http";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import type { BoardDefinition } from "@/lib/boards/board-definition";
import {
  boardDefinitionFromRow,
  deleteBoardForUser,
  getBoardForUser,
  updateBoardForUser,
} from "@/lib/boards/board-repository";

const patchBodySchema = z.object({
  name: z.string().min(1).optional(),
  definition: z.unknown().optional(),
});

function serializeBoard(board: NonNullable<Awaited<ReturnType<typeof getBoardForUser>>>) {
  return {
    id: board.id,
    name: board.name,
    projectId: board.projectId,
    moduleId: board.moduleId,
    definition: boardDefinitionFromRow(board.definition),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    projectName: board.project.name,
    moduleName: board.module?.name ?? null,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const { id } = await readParams(context.params);
  const board = await getBoardForUser(id, auth.user.id);
  if (!board) return notFound("Board not found.");

  return jsonOk(serializeBoard(board));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const { id } = await readParams(context.params);
  const parsed = await parseJsonBody(request, patchBodySchema);
  if (!parsed.ok) return parsed.response;

  const payload: { name?: string; definition?: BoardDefinition } = {};
  if (parsed.data.name != null) payload.name = parsed.data.name;
  if (parsed.data.definition != null) {
    payload.definition = parsed.data.definition as BoardDefinition;
  }

  const updated = await updateBoardForUser(id, auth.user.id, payload);
  if (!updated.ok) {
    return badRequest(updated.error);
  }
  if (!updated.board) {
    return notFound("Board not found.");
  }

  return jsonOk(serializeBoard(updated.board));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const { id } = await readParams(context.params);
  const deleted = await deleteBoardForUser(id, auth.user.id);
  if (!deleted) return notFound("Board not found.");

  return jsonOk({ deleted: true });
}
