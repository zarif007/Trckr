/**
 * Pluggable guardrails for whether a workflow may run in a given context.
 * V2 ships with allow-all; extend for tracker / module / project policies.
 */

import type { WorkflowTriggerData } from "../types";

export interface ScopePolicyContext {
  workflowId: string;
  projectId: string;
  moduleId?: string | null;
  userId: string;
  trigger: WorkflowTriggerData;
}

export interface WorkflowScopePolicy {
  canExecuteWorkflow(ctx: ScopePolicyContext): Promise<boolean>;
}

export const allowAllScopePolicy: WorkflowScopePolicy = {
  async canExecuteWorkflow() {
    return true;
  },
};

let activePolicy: WorkflowScopePolicy = allowAllScopePolicy;

export function setWorkflowScopePolicy(policy: WorkflowScopePolicy) {
  activePolicy = policy;
}

export function getWorkflowScopePolicy(): WorkflowScopePolicy {
  return activePolicy;
}

export async function canExecuteWorkflowScoped(
  ctx: ScopePolicyContext,
): Promise<boolean> {
  return activePolicy.canExecuteWorkflow(ctx);
}
