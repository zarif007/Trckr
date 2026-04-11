import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { validateBoardDefinitionBindings } from "./board-binding-validation";
import {
  emptyBoardDefinition,
  parseBoardDefinition,
  safeParseBoardDefinition,
  type BoardDefinition,
} from "./board-definition";

export type CreateBoardInput = {
  userId: string;
  projectId: string;
  moduleId?: string | null;
  name: string;
};

export async function createBoard(input: CreateBoardInput) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId: input.userId },
    select: { id: true },
  });
  if (!project) return null;

  if (input.moduleId != null) {
    const mod = await prisma.module.findFirst({
      where: { id: input.moduleId, projectId: input.projectId },
      select: { id: true },
    });
    if (!mod) return null;
  }

  const def = emptyBoardDefinition() as unknown as Prisma.InputJsonValue;

  return prisma.board.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      moduleId: input.moduleId ?? null,
      name: input.name.trim() || "Untitled dashboard",
      definition: def,
    },
  });
}

export async function getBoardForUser(boardId: string, userId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, userId },
    include: {
      project: { select: { id: true, name: true } },
      module: { select: { id: true, name: true } },
    },
  });
}

export async function updateBoardForUser(
  boardId: string,
  userId: string,
  data: {
    name?: string;
    definition?: BoardDefinition;
  },
): Promise<{ ok: true; board: Awaited<ReturnType<typeof getBoardForUser>> } | { ok: false; error: string }> {
  const existing = await prisma.board.findFirst({
    where: { id: boardId, userId },
    select: {
      id: true,
      projectId: true,
      moduleId: true,
    },
  });
  if (!existing) {
    return { ok: false, error: "Board not found." };
  }

  if (data.definition != null) {
    const parsed = safeParseBoardDefinition(data.definition);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }
    const bind = await validateBoardDefinitionBindings(
      parsed.data.elements,
      existing.projectId,
      existing.moduleId,
    );
    if (!bind.ok) {
      return { ok: false, error: bind.message };
    }
  }

  const updatePayload: Prisma.BoardUpdateInput = {};
  if (data.name != null) {
    updatePayload.name = data.name.trim() || "Untitled dashboard";
  }
  if (data.definition != null) {
    updatePayload.definition = data.definition as unknown as Prisma.InputJsonValue;
  }

  if (Object.keys(updatePayload).length === 0) {
    const board = await getBoardForUser(boardId, userId);
    return { ok: true, board };
  }

  await prisma.board.update({
    where: { id: boardId },
    data: updatePayload,
  });

  const board = await getBoardForUser(boardId, userId);
  return { ok: true, board };
}

export async function deleteBoardForUser(boardId: string, userId: string) {
  const existing = await prisma.board.findFirst({
    where: { id: boardId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.board.delete({ where: { id: boardId } });
  return true;
}

export function boardDefinitionFromRow(definition: unknown): BoardDefinition {
  return parseBoardDefinition(definition);
}
