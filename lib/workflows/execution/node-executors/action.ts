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
import { prisma } from "@/lib/db";

export async function executeActionNode(
  node: ActionNode,
  context: WorkflowExecutionContext,
): Promise<Record<string, unknown>> {
  const { actionType, trackerSchemaId, gridId } = node.config;

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
    return executeCreateRow(trackerSchemaId, gridId, mappedData);
  }

  if (actionType === "update_row") {
    if (!node.config.whereClause) {
      throw new Error("Update action requires a where clause");
    }
    return executeUpdateRow(
      trackerSchemaId,
      gridId,
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
      gridId,
      node.config.whereClause,
      context,
    );
  }

  throw new Error(`Unknown action type: ${(actionType as string) ?? "undefined"}`);
}

async function executeCreateRow(
  trackerSchemaId: string,
  gridId: string,
  mappedData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const trackerData = await findOrCreateTrackerData(trackerSchemaId);
  const dataObj =
    typeof trackerData.data === "object"
      ? (trackerData.data as Record<string, unknown>)
      : {};

  const grids = (dataObj.grids as Record<string, unknown[]>) ?? {};
  const gridRows: Record<string, unknown>[] = (grids[gridId] as Record<string, unknown>[]) ?? [];
  const newRow: Record<string, unknown> = { id: crypto.randomUUID(), ...mappedData };
  gridRows.push(newRow);

  (dataObj.grids as Record<string, unknown>)[gridId] = gridRows;

  await prisma.trackerData.update({
    where: { id: trackerData.id },
    data: { data: dataObj as object },
  });

  return { created: true, rowId: newRow.id };
}

async function executeUpdateRow(
  trackerSchemaId: string,
  gridId: string,
  mappedData: Record<string, unknown>,
  whereClause: unknown,
  context: WorkflowExecutionContext,
): Promise<Record<string, unknown>> {
  const trackerData = await findOrCreateTrackerData(trackerSchemaId);
  const dataObj =
    typeof trackerData.data === "object"
      ? (trackerData.data as Record<string, unknown>)
      : {};

  const grids = (dataObj.grids as Record<string, unknown[]>) ?? {};
  const gridRows =
    (grids[gridId] as Record<string, unknown>[]) ?? [];

  let updated = false;
  for (const row of gridRows) {
    if (rowMatchesWhere(row, whereClause, context)) {
      Object.assign(row, mappedData);
      updated = true;
    }
  }

  if (!updated) return { updated: false, reason: "no_matching_rows" };

  (dataObj.grids as Record<string, unknown>)[gridId] = gridRows;
  await prisma.trackerData.update({
    where: { id: trackerData.id },
    data: { data: dataObj as object },
  });

  return { updated: true };
}

async function executeDeleteRow(
  trackerSchemaId: string,
  gridId: string,
  whereClause: unknown,
  context: WorkflowExecutionContext,
): Promise<Record<string, unknown>> {
  const trackerData = await findOrCreateTrackerData(trackerSchemaId);
  const dataObj =
    typeof trackerData.data === "object"
      ? (trackerData.data as Record<string, unknown>)
      : {};

  const grids = (dataObj.grids as Record<string, unknown[]>) ?? {};
  const gridRows =
    (grids[gridId] as Record<string, unknown>[]) ?? [];

  const filteredRows = gridRows.filter(
    (row) => !rowMatchesWhere(row, whereClause, context),
  );

  (dataObj.grids as Record<string, unknown>)[gridId] = filteredRows;
  await prisma.trackerData.update({
    where: { id: trackerData.id },
    data: { data: dataObj as object },
  });

  return {
    deleted: true,
    removedCount: gridRows.length - filteredRows.length,
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

async function findOrCreateTrackerData(trackerSchemaId: string) {
  let trackerData = await prisma.trackerData.findFirst({
    where: { trackerSchemaId },
    orderBy: { updatedAt: "desc" },
  });

  if (!trackerData) {
    trackerData = await prisma.trackerData.create({
      data: {
        trackerSchemaId,
        data: { grids: {} } as object,
      },
    });
  }

  return trackerData;
}
