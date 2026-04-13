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
import { migrateBoardDefinitionV2toV3 } from "./board-migration";

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

/**
 * Migrate version 1 board definition (old grid layout) to version 3 (new grid layout).
 * Preserves vertical order by sorting by y-axis, then x-axis.
 * Then applies v2→v3 migration for grid positioning.
 */
function migrateV1ToV3(def: any): BoardDefinition {
  if (def.version !== 1 || !Array.isArray(def.elements)) {
    return parseBoardDefinition(def);
  }

  const sorted = [...def.elements].sort((a: any, b: any) => {
    const aLayout = a.layout || { y: 0, x: 0 };
    const bLayout = b.layout || { y: 0, x: 0 };
    if (aLayout.y !== bLayout.y) return aLayout.y - bLayout.y;
    return aLayout.x - bLayout.x;
  });

  const migrated = sorted.map((el: any, index: number) => {
    const { layout, ...rest } = el;
    return { ...rest, placeId: index };
  });

  const v2Format = {
    version: 2 as const,
    elements: migrated,
  };

  // Apply v2→v3 migration
  return migrateBoardDefinitionV2toV3(v2Format);
}

export function boardDefinitionFromRow(definition: unknown): BoardDefinition {
  const parsed = parseBoardDefinition(definition);

  if ((parsed as any).version === 1) {
    return migrateV1ToV3(parsed);
  }

  // Auto-migrate v2 → v3 (linear ordering → grid layout)
  if ((parsed as any).version === 2) {
    return migrateBoardDefinitionV2toV3(parsed as any);
  }

  return parsed;
}
