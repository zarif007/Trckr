/**
 * Action node executor.
 * Performs create/update/delete row operations on the target tracker.
 */
import { evaluateExpr } from "@/lib/functions/evaluator";
import type { FunctionContext } from "@/lib/functions/types";
import type {
  ActionNode,
  WorkflowExecutionContext,
} from "@/lib/workflows/types";
import { prisma, Prisma } from "@/lib/db";
import { getPrimaryGridSlug } from "@/lib/workflows/resolve-primary-grid";

export async function executeActionNode(
  node: ActionNode,
  context: WorkflowExecutionContext,
): Promise<Record<string, unknown>> {
  const { actionType, trackerSchemaId } = node.config;

  const gridSlug =
    node.config.gridId != null && node.config.gridId !== ""
      ? node.config.gridId
      : await getPrimaryGridSlug(trackerSchemaId);

  let mappedData: Record<string, unknown> = {};
  if (
    node.config.mapFieldsNodeId &&
    context.nodeData[node.config.mapFieldsNodeId]
  ) {
    mappedData = context.nodeData[node.config.mapFieldsNodeId];
  } else if (Object.keys(context.mappedData).length > 0) {
    mappedData = context.mappedData;
  }

  if (actionType === "create_row") {
    return executeCreateRow(trackerSchemaId, gridSlug, mappedData);
  }

  if (actionType === "update_row") {
    if (!node.config.whereClause) {
      throw new Error("Update action requires a where clause");
    }
    return executeUpdateRow(
      trackerSchemaId,
      gridSlug,
      mappedData,
      node.config.whereClause,
      context,
    );
  }

  if (actionType === "delete_row") {
    if (!node.config.whereClause) {
      throw new Error("Delete action requires a where clause");
    }
    return executeDeleteRow(
      trackerSchemaId,
      gridSlug,
      node.config.whereClause,
      context,
    );
  }

  throw new Error(`Unknown action type: ${(actionType as string) ?? "undefined"}`);
}

async function resolveGridNodeId(
  trackerSchemaId: string,
  gridSlug: string,
): Promise<string> {
  const node = await prisma.trackerNode.findFirst({
    where: {
      trackerId: trackerSchemaId,
      slug: gridSlug,
      type: "GRID",
    },
    select: { id: true },
  });
  if (!node) {
    throw new Error(
      `Grid not found: ${gridSlug} (tracker ${trackerSchemaId})`,
    );
  }
  return node.id;
}

async function getTrackerSchemaVersion(
  trackerSchemaId: string,
): Promise<string> {
  const t = await prisma.trackerSchema.findUnique({
    where: { id: trackerSchemaId },
    select: { schemaVersion: true },
  });
  if (!t) {
    throw new Error(`Tracker schema not found: ${trackerSchemaId}`);
  }
  return String(t.schemaVersion);
}

async function nextSortOrder(
  trackerSchemaId: string,
  gridNodeId: string,
  branchName: string,
): Promise<number> {
  const last = await prisma.gridRow.findFirst({
    where: {
      trackerId: trackerSchemaId,
      gridId: gridNodeId,
      branchName,
      deletedAt: null,
    },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return last ? last.sortOrder + 1 : 1;
}

async function executeCreateRow(
  trackerSchemaId: string,
  gridSlug: string,
  mappedData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const gridNodeId = await resolveGridNodeId(trackerSchemaId, gridSlug);
  const schemaVersion = await getTrackerSchemaVersion(trackerSchemaId);
  const branchName = "main";
  const newRowId = crypto.randomUUID();
  const rowPayload: Record<string, unknown> = {
    ...mappedData,
    id: newRowId,
  };
  const sortOrder = await nextSortOrder(
    trackerSchemaId,
    gridNodeId,
    branchName,
  );

  await prisma.gridRow.create({
    data: {
      trackerId: trackerSchemaId,
      gridId: gridNodeId,
      data: rowPayload as Prisma.InputJsonValue,
      schemaVersion,
      sortOrder,
      branchName,
    },
  });

  return { created: true, rowId: newRowId };
}

async function executeUpdateRow(
  trackerSchemaId: string,
  gridSlug: string,
  mappedData: Record<string, unknown>,
  whereClause: unknown,
  context: WorkflowExecutionContext,
): Promise<Record<string, unknown>> {
  const gridNodeId = await resolveGridNodeId(trackerSchemaId, gridSlug);
  const rows = await prisma.gridRow.findMany({
    where: {
      trackerId: trackerSchemaId,
      gridId: gridNodeId,
      branchName: "main",
      deletedAt: null,
    },
    select: { id: true, data: true, version: true },
  });

  let updated = false;
  for (const row of rows) {
    const rowData =
      typeof row.data === "object" && row.data !== null
        ? (row.data as Record<string, unknown>)
        : {};
    if (rowMatchesWhere(rowData, whereClause, context)) {
      await prisma.gridRow.update({
        where: { id: row.id },
        data: {
          data: { ...rowData, ...mappedData } as Prisma.InputJsonValue,
          version: row.version + 1,
        },
      });
      updated = true;
    }
  }

  if (!updated) return { updated: false, reason: "no_matching_rows" };

  return { updated: true };
}

async function executeDeleteRow(
  trackerSchemaId: string,
  gridSlug: string,
  whereClause: unknown,
  context: WorkflowExecutionContext,
): Promise<Record<string, unknown>> {
  const gridNodeId = await resolveGridNodeId(trackerSchemaId, gridSlug);
  const rows = await prisma.gridRow.findMany({
    where: {
      trackerId: trackerSchemaId,
      gridId: gridNodeId,
      branchName: "main",
      deletedAt: null,
    },
    select: { id: true, data: true },
  });

  let removedCount = 0;
  for (const row of rows) {
    const rowData =
      typeof row.data === "object" && row.data !== null
        ? (row.data as Record<string, unknown>)
        : {};
    if (rowMatchesWhere(rowData, whereClause, context)) {
      await prisma.gridRow.update({
        where: { id: row.id },
        data: { deletedAt: new Date() },
      });
      removedCount += 1;
    }
  }

  return {
    deleted: true,
    removedCount,
  };
}

function rowMatchesWhere(
  row: Record<string, unknown>,
  whereClause: unknown,
  _context: WorkflowExecutionContext,
): boolean {
  const fnCtx: FunctionContext = { rowValues: row, fieldId: "where" };
  const result = evaluateExpr(whereClause as any, fnCtx);
  return !!result;
}
