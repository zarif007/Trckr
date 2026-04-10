/**
 * Workflow execution engine.
 * Orchestrates node execution following the graph topology,
 * handles branching for condition nodes, and records run data.
 */

import { prisma, Prisma } from "@/lib/db";
import type { WorkflowRunStatus } from "@prisma/client";
import { normalizeWorkflowEdges } from "@/lib/workflows/validation";
import type {
  WorkflowInlineEffects,
  WorkflowSchema,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTriggerData,
  WorkflowExecutionContext,
} from "@/lib/workflows/types";
import { executeTriggerNode } from "./node-executors/trigger";
import { executeConditionNode } from "./node-executors/condition";
import { executeMapFieldsNode } from "./node-executors/map-fields";
import { executeActionNode } from "./node-executors/action";
import { executeRedirectNode } from "./node-executors/redirect";

export interface WorkflowExecutionHooks {
  onRunCreated?: (runId: string) => void;
}

export interface WorkflowExecutionResult {
  success: boolean;
  runId: string;
  error?: string;
  inlineEffects?: WorkflowInlineEffects;
}

async function markRunStatus(
  runId: string,
  status: WorkflowRunStatus,
  error?: string,
) {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: status !== "running" ? new Date() : undefined,
      error: error ?? null,
    },
  });
}

async function createStep(
  runId: string,
  nodeId: string,
  status: WorkflowRunStatus,
  inputData?: Record<string, unknown>,
  outputData?: Record<string, unknown>,
  error?: string,
) {
  await prisma.workflowRunStep.create({
    data: {
      runId,
      nodeId,
      status,
      ...(inputData && { inputData: inputData as Prisma.InputJsonValue }),
      ...(outputData && { outputData: outputData as Prisma.InputJsonValue }),
      startedAt: new Date(),
      finishedAt: new Date(),
      error: error ?? null,
    },
  });
}

function buildAdjacencyList(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): Map<string, { edge: WorkflowEdge; node: WorkflowNode | undefined }[]> {
  const list = new Map<string, { edge: WorkflowEdge; node: WorkflowNode | undefined }[]>();
  for (const node of nodes) {
    list.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = list.get(edge.source) ?? [];
    const targetNode = nodes.find((n) => n.id === edge.target);
    targets.push({ edge, node: targetNode });
    list.set(edge.source, targets);
  }
  return list;
}

export async function executeWorkflow(
  workflowId: string,
  schema: WorkflowSchema,
  triggerData: WorkflowTriggerData,
  hooks?: WorkflowExecutionHooks,
): Promise<WorkflowExecutionResult> {
  const normalized = normalizeWorkflowEdges(schema);
  const { nodes, edges } = normalized;

  const triggerNode = nodes.find(
    (n) => n.type === "trigger",
  ) as Extract<WorkflowNode, { type: "trigger" }> | undefined;

  if (!triggerNode) {
    return { success: false, runId: "", error: "No trigger node found" };
  }

  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      status: "pending",
      trigger: triggerData as unknown as Prisma.InputJsonValue,
    },
  });

  hooks?.onRunCreated?.(run.id);

  const context: WorkflowExecutionContext = {
    triggerData,
    mappedData: {},
    nodeData: {},
    inlineEffects: {},
  };

  const adjacencyList = buildAdjacencyList(nodes, edges);

  await markRunStatus(run.id, "running");

  try {
    executeTriggerNode(triggerNode, triggerData);
    await createStep(
      run.id,
      triggerNode.id,
      "completed",
      triggerData as unknown as Record<string, unknown>,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Trigger validation failed";
    await markRunStatus(run.id, "failed", message);
    await createStep(
      run.id,
      triggerNode.id,
      "failed",
      undefined,
      undefined,
      message,
    );
    return { success: false, runId: run.id, error: message };
  }

  try {
    await dfsExecute(
      triggerNode.id,
      adjacencyList,
      nodes,
      context,
      run.id,
      new Set<string>(),
    );
    await markRunStatus(run.id, "completed");
    return {
      success: true,
      runId: run.id,
      inlineEffects: context.inlineEffects,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Workflow execution failed";
    await markRunStatus(run.id, "failed", message);
    return { success: false, runId: run.id, error: message };
  }
}

async function dfsExecute(
  nodeId: string,
  adjacencyList: Map<string, { edge: WorkflowEdge; node: WorkflowNode | undefined }[]>,
  nodes: WorkflowNode[],
  context: WorkflowExecutionContext,
  runId: string,
  visited: Set<string>,
): Promise<void> {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return;

  const targets = adjacencyList.get(nodeId) ?? [];

  await executeNode(node, context, runId);

  for (const { edge, node: targetNode } of targets) {
    if (!targetNode) continue;

    if (node.type === "condition") {
      const branchResult = context._lastConditionResult ?? null;
      delete context._lastConditionResult;

      if (edge.branchType === branchResult) {
        await dfsExecute(
          edge.target,
          adjacencyList,
          nodes,
          context,
          runId,
          visited,
        );
      }
    } else {
      await dfsExecute(
        edge.target,
        adjacencyList,
        nodes,
        context,
        runId,
        visited,
      );
    }
  }
}

async function executeNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  runId: string,
): Promise<void> {
  switch (node.type) {
    case "trigger": {
      break;
    }
    case "condition": {
      const branchResult = await executeConditionNode(node, context);
      context._lastConditionResult = branchResult;
      await createStep(
        runId,
        node.id,
        "completed",
        conditionStepInput(node),
        { result: branchResult },
      );
      break;
    }
    case "map_fields": {
      const mappingResult = await executeMapFieldsNode(node, context);
      context.nodeData[node.id] = context.mappedData;
      await createStep(
        runId,
        node.id,
        "completed",
        { mappings: node.config.mappings } as unknown as Record<string, unknown>,
        mappingResult,
      );
      break;
    }
    case "action": {
      const actionResult = await executeActionNode(node, context);
      await createStep(
        runId,
        node.id,
        "completed",
        { actionType: node.config.actionType } as unknown as Record<string, unknown>,
        actionResult,
      );
      break;
    }
    case "redirect": {
      const out = executeRedirectNode(node, context);
      await createStep(
        runId,
        node.id,
        "completed",
        node.config as unknown as Record<string, unknown>,
        out,
      );
      break;
    }
  }
}

function conditionStepInput(
  node: Extract<WorkflowNode, { type: "condition" }>,
): Record<string, unknown> {
  return { condition: node.config.condition as unknown };
}
