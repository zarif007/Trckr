import "server-only";

import { NodeType } from "@prisma/client";

import { prisma } from "@/lib/db";

import type { BoardElement } from "./board-definition";

export type BoardBindingValidationResult =
  | { ok: true }
  | { ok: false; message: string; elementId?: string };

async function assertTrackerInScope(
  trackerSchemaId: string,
  projectId: string,
  moduleId: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerSchemaId, projectId },
    select: { id: true, moduleId: true },
  });
  if (!tracker) {
    return { ok: false, message: "Tracker not found for this project." };
  }
  if (moduleId != null && tracker.moduleId !== moduleId) {
    return {
      ok: false,
      message: "Tracker does not belong to this board's module.",
    };
  }
  return { ok: true };
}

async function assertGridAndFields(
  trackerSchemaId: string,
  gridIdOrSlug: string,
  fieldIds: string[],
  groupByFieldId?: string,
  metricFieldId?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const grid = await prisma.trackerNode.findFirst({
    where: {
      trackerId: trackerSchemaId,
      type: NodeType.GRID,
      OR: [{ id: gridIdOrSlug }, { slug: gridIdOrSlug }],
    },
    select: { id: true },
  });
  if (!grid) {
    return { ok: false, message: "Grid not found on tracker." };
  }

  const internalGridId = grid.id;

  const layoutFields = await prisma.trackerLayoutNode.findMany({
    where: { trackerId: trackerSchemaId, gridId: internalGridId },
    select: { fieldId: true },
  });
  const allowedFieldIds = new Set(layoutFields.map((l) => l.fieldId));

  const allRefs = new Set<string>(fieldIds);
  if (groupByFieldId) allRefs.add(groupByFieldId);
  if (metricFieldId) allRefs.add(metricFieldId);

  for (const ref of allRefs) {
    const field = await prisma.trackerField.findFirst({
      where: {
        trackerId: trackerSchemaId,
        OR: [{ id: ref }, { slug: ref }],
      },
      select: { id: true },
    });
    if (!field) {
      return { ok: false, message: "One or more fields are invalid." };
    }
    if (!allowedFieldIds.has(field.id)) {
      return {
        ok: false,
        message: `Field ${ref} is not on the selected grid.`,
      };
    }
  }

  return { ok: true };
}

export async function validateBoardElementBindings(
  element: BoardElement,
  projectId: string,
  moduleId: string | null,
): Promise<BoardBindingValidationResult> {
  const source = element.source;
  const trackerOk = await assertTrackerInScope(
    source.trackerSchemaId,
    projectId,
    moduleId,
  );
  if (!trackerOk.ok) {
    return { ok: false, message: trackerOk.message, elementId: element.id };
  }

  if (element.type === "stat") {
    if (element.aggregate !== "count" && source.fieldIds.length === 0) {
      return {
        ok: false,
        message: "Stat requires a field for sum or average.",
        elementId: element.id,
      };
    }
    const gridOk = await assertGridAndFields(
      source.trackerSchemaId,
      source.gridId,
      source.fieldIds,
    );
    if (!gridOk.ok) {
      return { ok: false, message: gridOk.message, elementId: element.id };
    }
    return { ok: true };
  }

  if (element.type === "table") {
    if (source.fieldIds.length === 0) {
      return {
        ok: false,
        message: "Table needs at least one column field.",
        elementId: element.id,
      };
    }
    const gridOk = await assertGridAndFields(
      source.trackerSchemaId,
      source.gridId,
      source.fieldIds,
    );
    if (!gridOk.ok) {
      return { ok: false, message: gridOk.message, elementId: element.id };
    }
    return { ok: true };
  }

  if (element.type === "chart") {
    const chartSource = element.source;
    const gridOk = await assertGridAndFields(
      chartSource.trackerSchemaId,
      chartSource.gridId,
      chartSource.fieldIds,
      chartSource.groupByFieldId,
      chartSource.metricFieldId ?? null,
    );
    if (!gridOk.ok) {
      return { ok: false, message: gridOk.message, elementId: element.id };
    }
    return { ok: true };
  }

  return { ok: true };
}

export async function validateBoardDefinitionBindings(
  elements: BoardElement[],
  projectId: string,
  moduleId: string | null,
): Promise<BoardBindingValidationResult> {
  for (const el of elements) {
    const r = await validateBoardElementBindings(el, projectId, moduleId);
    if (!r.ok) return r;
  }
  return { ok: true };
}
