/**
 * Trigger handler.
 * Dispatches matching workflows when tracker data snapshots are saved.
 * Called after successful snapshot mutations (create/update/upsert).
 *
 * Since the app stores full snapshots (not individual row mutations), we diff
 * the old and new snapshots to emit row-level events.
 */

import { prisma } from "@/lib/db";
import type {
  WorkflowInlineEffects,
  WorkflowSchema,
} from "@/lib/workflows/types";
import { canExecuteWorkflowScoped } from "../registries/scope-policy";
import { executeWorkflow } from "./engine";
import { executeWorkflowHybrid } from "./execute-workflow-hybrid";
import type { ScheduleBackgroundWork } from "./execute-workflow-hybrid";

interface SnapshotData {
  grids?: Record<string, Record<string, unknown>[]>;
  [key: string]: unknown;
}

export interface DispatchOrchestrationOptions {
  /** When true, use a short inline timeout and schedule slow runs via `after()`. */
  interactive?: boolean;
  inlineTimeoutMs?: number;
  scheduleBackgroundWork?: ScheduleBackgroundWork;
}

export interface DispatchOrchestrationResult {
  inlineEffects: WorkflowInlineEffects;
  continuationScheduled: boolean;
}

const emptyDispatchResult: DispatchOrchestrationResult = {
  inlineEffects: {},
  continuationScheduled: false,
};

function mergeInlineEffects(
  into: WorkflowInlineEffects,
  next?: WorkflowInlineEffects,
) {
  if (!next) return;
  if (next.redirect && !into.redirect) {
    into.redirect = next.redirect;
  }
}

/**
 * After a tracker data snapshot is saved, find and dispatch matching workflows.
 * Call this from the data save flow (POST/PATCH) AFTER the data is persisted.
 * Only **version 2** workflows are executed from this path (V1 remains read-only in product).
 */
export async function dispatchTrackerEventAfterSave(
  trackerSchemaId: string,
  newData: SnapshotData,
  oldData: SnapshotData | null,
  userId: string,
  isCreate: boolean,
  options?: DispatchOrchestrationOptions,
): Promise<DispatchOrchestrationResult> {
  const rowChanges = diffSnapshots(oldData, newData);

  if (rowChanges.length === 0) return emptyDispatchResult;

  const workflows = await findMatchingWorkflows(trackerSchemaId);
  if (workflows.length === 0) return emptyDispatchResult;

  const aggregate: DispatchOrchestrationResult = {
    inlineEffects: {},
    continuationScheduled: false,
  };

  for (const change of rowChanges) {
    const eventType = isCreate ? "row_create" : change.operation;
    const matchingWorkflows = workflows.filter(
      (wf) =>
        isV2WorkflowRecord(wf) &&
        hasTriggerForEvent(wf, eventType),
    );

    for (const wf of matchingWorkflows) {
      const schema = wf.schema as unknown as WorkflowSchema;
      const triggerPayload = {
        event: change.operation,
        trackerSchemaId,
        gridId: change.gridId,
        rowId: change.rowId,
        rowData: change.rowData,
        changedFields: change.changedFields,
        previousRowData: change.previousRowData,
      };
      const allowed = await canExecuteWorkflowScoped({
        workflowId: wf.id,
        projectId: wf.projectId,
        moduleId: wf.moduleId ?? null,
        userId,
        trigger: triggerPayload,
      });
      if (!allowed) continue;

      try {
        if (options?.interactive) {
          const hybrid = await executeWorkflowHybrid(
            wf.id,
            schema,
            triggerPayload,
            {
              inlineTimeoutMs: options.inlineTimeoutMs,
              scheduleBackgroundWork: options.scheduleBackgroundWork,
            },
          );
          if (hybrid.result) {
            mergeInlineEffects(
              aggregate.inlineEffects,
              hybrid.result.inlineEffects,
            );
          }
          aggregate.continuationScheduled ||= hybrid.continuationScheduled;
        } else {
          const result = await executeWorkflow(wf.id, schema, triggerPayload);
          mergeInlineEffects(aggregate.inlineEffects, result.inlineEffects);
        }
      } catch {
        // Execution engine records failures in WorkflowRun / WorkflowRunStep
      }
    }
  }

  return aggregate;
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

    const rowStableId = (row: Record<string, unknown>) =>
      String(row.id ?? row._rowId ?? "");

    const oldById = new Map<string, Record<string, unknown>>();
    for (const row of oldRows) {
      const id = rowStableId(row);
      if (id) oldById.set(id, row);
    }

    const newById = new Map<string, Record<string, unknown>>();
    for (const row of newRows) {
      const id = rowStableId(row);
      if (id) newById.set(id, row);
    }

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

function isV2WorkflowRecord(wf: { schema: unknown }): boolean {
  return (
    typeof wf.schema === "object" &&
    wf.schema !== null &&
    (wf.schema as { version?: number }).version === 2
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
