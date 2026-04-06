/**
 * Trigger handler.
 * Dispatches matching workflows when tracker data snapshots are saved.
 * Called after successful snapshot mutations (create/update/upsert).
 *
 * Since the app stores full snapshots (not individual row mutations), we diff
 * the old and new snapshots to emit row-level events.
 */

import { prisma } from "@/lib/db";
import type { WorkflowSchema } from "@/lib/workflows/types";
import { executeWorkflow } from "./engine";

interface SnapshotData {
  grids?: Record<string, Record<string, unknown>[]>;
  [key: string]: unknown;
}

/**
 * After a tracker data snapshot is saved, find and dispatch matching workflows.
 * Call this from the data save flow (POST/PATCH) AFTER the data is persisted.
 */
export async function dispatchTrackerEventAfterSave(
  trackerSchemaId: string,
  newData: SnapshotData,
  oldData: SnapshotData | null,
  userId: string,
  isCreate: boolean,
): Promise<void> {
  const rowChanges = diffSnapshots(oldData, newData);

  if (rowChanges.length === 0) return;

  const workflows = await findMatchingWorkflows(trackerSchemaId);
  if (workflows.length === 0) return;

  for (const change of rowChanges) {
    const eventType = isCreate ? "row_create" : change.operation;
    const matchingWorkflows = workflows.filter((wf) =>
      hasTriggerForEvent(wf, eventType),
    );

    for (const wf of matchingWorkflows) {
      await dispatchWorkflowForChange(
        wf.id,
        wf.schema as unknown as WorkflowSchema,
        trackerSchemaId,
        change,
        userId,
      );
    }
  }
}

interface RowChange {
  operation: "row_create" | "row_update" | "row_delete";
  gridId: string;
  rowId: string;
  rowData: Record<string, unknown>;
  previousRowData?: Record<string, unknown>;
  changedFields?: string[];
}

function diffSnapshots(
  oldData: SnapshotData | null,
  newData: SnapshotData,
): RowChange[] {
  const changes: RowChange[] = [];
  const oldGrids = oldData?.grids ?? {};
  const newGrids = newData?.grids ?? {};

  const allGridIds = new Set([
    ...Object.keys(oldGrids),
    ...Object.keys(newGrids),
  ]);

  for (const gridId of allGridIds) {
    const oldRows = (oldGrids[gridId] as Record<string, unknown>[]) ?? [];
    const newRows = (newGrids[gridId] as Record<string, unknown>[]) ?? [];

    const oldById = new Map<string, Record<string, unknown>>();
    for (const row of oldRows) {
      const id = row.id as string;
      if (id) oldById.set(id, row);
    }

    const newById = new Map<string, Record<string, unknown>>();
    for (const row of newRows) {
      const id = row.id as string;
      if (id) newById.set(id, row);
    }

    // Added rows
    for (const [id, row] of newById) {
      if (!oldById.has(id)) {
        changes.push({
          operation: "row_create",
          gridId,
          rowId: id,
          rowData: row,
        });
      }
    }

    // Updated rows
    for (const [id, newRow] of newById) {
      const oldRow = oldById.get(id);
      if (oldRow) {
        const changedFields = findChangedFields(oldRow, newRow);
        if (changedFields.length > 0) {
          changes.push({
            operation: "row_update",
            gridId,
            rowId: id,
            rowData: newRow,
            previousRowData: oldRow,
            changedFields,
          });
        }
      }
    }

    // Deleted rows
    for (const [id, oldRow] of oldById) {
      if (!newById.has(id)) {
        changes.push({
          operation: "row_delete",
          gridId,
          rowId: id,
          rowData: oldRow,
        });
      }
    }
  }

  return changes;
}

function findChangedFields(
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
): string[] {
  const allKeys = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);
  const changed: string[] = [];
  for (const key of allKeys) {
    if (key === "id") continue;
    if (JSON.stringify(oldRow[key]) !== JSON.stringify(newRow[key])) {
      changed.push(key);
    }
  }
  return changed;
}

async function findMatchingWorkflows(trackerSchemaId: string) {
  const allWorkflows = await prisma.workflow.findMany({
    where: { enabled: true },
    include: {
      project: {
        select: {
          id: true,
          trackerSchemas: {
            where: { id: trackerSchemaId },
            select: { id: true },
          },
        },
      },
    },
  });

  return allWorkflows.filter((wf) =>
    wf.project.trackerSchemas.some((s) => s.id === trackerSchemaId),
  );
}

function hasTriggerForEvent(
  wf: { schema: unknown },
  eventType: string,
): boolean {
  const schema = wf.schema as {
    nodes?: Array<{ type: string; config?: { event?: string } }>;
  };
  const nodes = schema.nodes ?? [];
  return nodes.some(
    (n) => n.type === "trigger" && n.config?.event === eventType,
  );
}

async function dispatchWorkflowForChange(
  workflowId: string,
  schema: WorkflowSchema,
  trackerSchemaId: string,
  change: RowChange,
  userId: string,
): Promise<void> {
  try {
    await executeWorkflow(workflowId, schema, {
      event: change.operation,
      trackerSchemaId,
      gridId: change.gridId,
      rowId: change.rowId,
      rowData: change.rowData,
      changedFields: change.changedFields,
      previousRowData: change.previousRowData,
    });
  } catch {
    // Execution engine records failures in WorkflowRunStep
  }
}
