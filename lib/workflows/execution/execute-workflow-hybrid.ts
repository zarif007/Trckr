/**
 * Hybrid workflow execution: return inline results when fast enough,
 * otherwise schedule completion after the HTTP response (Next.js `after`).
 */

import { after } from "next/server";
import type { WorkflowSchema, WorkflowTriggerData } from "../types";
import {
  executeWorkflow,
  type WorkflowExecutionResult,
} from "./engine";

export const DEFAULT_WORKFLOW_INLINE_TIMEOUT_MS = 2500;

export type ScheduleBackgroundWork = (fn: () => void) => void;

function defaultScheduleBackground(fn: () => void) {
  try {
    after(fn);
  } catch {
    queueMicrotask(fn);
  }
}

export async function executeWorkflowHybrid(
  workflowId: string,
  schema: WorkflowSchema,
  triggerData: WorkflowTriggerData,
  options?: {
    inlineTimeoutMs?: number;
    scheduleBackgroundWork?: ScheduleBackgroundWork;
  },
): Promise<{
  result: WorkflowExecutionResult | null;
  continuationScheduled: boolean;
}> {
  const ms =
    options?.inlineTimeoutMs ?? DEFAULT_WORKFLOW_INLINE_TIMEOUT_MS;
  const scheduleBackground =
    options?.scheduleBackgroundWork ?? defaultScheduleBackground;

  let tid: ReturnType<typeof setTimeout>;
  const timeoutSignal = new Promise<"timeout">((resolve) => {
    tid = setTimeout(() => resolve("timeout"), ms);
  });

  const execution = executeWorkflow(workflowId, schema, triggerData);

  try {
    const winner = await Promise.race([
      execution.then((r) => ({ kind: "done" as const, r })),
      timeoutSignal.then(() => ({ kind: "timeout" as const })),
    ]);

    clearTimeout(tid!);

    if (winner.kind === "done") {
      return { result: winner.r, continuationScheduled: false };
    }

    scheduleBackground(() => {
      execution.catch((err) => {
        console.error("[workflow] async continuation failed", err);
      });
    });
    return { result: null, continuationScheduled: true };
  } catch (err) {
    clearTimeout(tid!);
    throw err;
  }
}
