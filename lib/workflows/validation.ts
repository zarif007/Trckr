/**
 * Workflow validation logic.
 * Validates workflow schemas before saving to catch configuration errors early.
 */

import type { WorkflowEdge, WorkflowNode, WorkflowSchema } from "./types";
import { isWorkflowSchemaV2 } from "./types";

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
}

export interface WorkflowValidationResult {
  errors: ValidationError[];
  warnings: ValidationError[];
}

function buildOutgoingAdjacency(
  edges: WorkflowEdge[],
): Map<string, WorkflowEdge[]> {
  const map = new Map<string, WorkflowEdge[]>();
  for (const e of edges) {
    const list = map.get(e.source) ?? [];
    list.push(e);
    map.set(e.source, list);
  }
  return map;
}

/**
 * True if there exists a path from start to target that never visits a map_fields node.
 * Used for V2 mapping-first rule (invalid when this returns true for trigger → action).
 */
function hasPathAvoidingMapFields(
  nodesById: Map<string, WorkflowNode>,
  outgoing: Map<string, WorkflowEdge[]>,
  startId: string,
  targetId: string,
): boolean {
  const visited = new Set<string>();
  const stack: { id: string; seenMapOnPath: boolean }[] = [
    { id: startId, seenMapOnPath: false },
  ];

  while (stack.length > 0) {
    const { id, seenMapOnPath } = stack.pop()!;
    const node = nodesById.get(id);
    if (!node) continue;

    const seen2 = seenMapOnPath || node.type === "map_fields";

    if (id === targetId && node.type === "action" && !seen2) {
      return true;
    }

    const key = `${id}:${seen2}`;
    if (visited.has(key)) continue;
    visited.add(key);

    for (const edge of outgoing.get(id) ?? []) {
      stack.push({ id: edge.target, seenMapOnPath: seen2 });
    }
  }

  return false;
}

/** V2: every action must only be reachable from trigger via paths that visit map_fields. */
function validateMapFieldsPrecedesActions(
  schema: WorkflowSchema,
  nodesById: Map<string, WorkflowNode>,
  outgoing: Map<string, WorkflowEdge[]>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const trigger = schema.nodes.find((n) => n.type === "trigger");
  if (!trigger) return errors;

  for (const node of schema.nodes) {
    if (node.type !== "action") continue;
    if (hasPathAvoidingMapFields(nodesById, outgoing, trigger.id, node.id)) {
      errors.push({
        code: "MAP_REQUIRED_BEFORE_ACTION",
        message: `Action "${node.label || node.id}" must have Map Fields upstream on every path from the trigger`,
        nodeId: node.id,
      });
    }
  }
  return errors;
}

function validateConditionBranchEdges(
  schema: WorkflowSchema,
  nodesById: Map<string, WorkflowNode>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const edge of schema.edges) {
    const src = nodesById.get(edge.source);
    if (src?.type !== "condition") continue;
    if (edge.branchType !== "true" && edge.branchType !== "false") {
      errors.push({
        code: "MISSING_BRANCH_TYPE",
        message:
          "Each connection from an IF node must use the true or false handle (branch metadata missing)",
        nodeId: src.id,
      });
    }
  }
  return errors;
}

function validateRedirectDownstream(schema: WorkflowSchema): ValidationError[] {
  const warnings: ValidationError[] = [];
  for (const node of schema.nodes) {
    if (node.type !== "redirect") continue;
    const hasDownstream = schema.edges.some((e) => e.source === node.id);
    if (hasDownstream) {
      warnings.push({
        code: "REDIRECT_HAS_DOWNSTREAM",
        message: `Redirect "${node.label || node.id}" has outgoing connections; only the first redirect effect may apply at runtime`,
        nodeId: node.id,
      });
    }
  }
  return warnings;
}

export function validateWorkflowSchema(schema: WorkflowSchema): ValidationError[] {
  return validateWorkflowSchemaFull(schema).errors;
}

export function validateWorkflowSchemaFull(
  schema: WorkflowSchema,
): WorkflowValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const triggers = schema.nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) {
    errors.push({
      code: "NO_TRIGGER",
      message: "Workflow must have at least one trigger node",
    });
  } else if (triggers.length > 1) {
    errors.push({
      code: "MULTIPLE_TRIGGERS",
      message: "Workflow can only have one trigger node",
    });
  }

  const v2 = isWorkflowSchemaV2(schema);
  const nodesById = new Map(schema.nodes.map((n) => [n.id, n]));
  const outgoing = buildOutgoingAdjacency(schema.edges);

  if (v2) {
    for (const node of schema.nodes) {
      if (node.type === "redirect") continue;
      if (node.type === "trigger" && node.config.gridId) {
        warnings.push({
          code: "V2_TRIGGER_GRID_IGNORED",
          message: `Trigger "${node.label || node.id}" has gridId set; V2 uses tracker-wide events and ignores gridId`,
          nodeId: node.id,
        });
      }
      if (node.type === "action" && node.config.gridId) {
        warnings.push({
          code: "V2_ACTION_GRID_IGNORED",
          message: `Action "${node.label || node.id}" has gridId set; V2 resolves the primary grid automatically`,
          nodeId: node.id,
        });
      }
      if (node.type === "map_fields") {
        for (const m of node.config.mappings) {
          if (m.target.gridId) {
            warnings.push({
              code: "V2_MAP_GRID_IGNORED",
              message: `Map Fields "${node.label || node.id}" uses target.gridId; V2 uses the target tracker's primary grid`,
              nodeId: node.id,
            });
            break;
          }
        }
      }
    }

    errors.push(
      ...validateMapFieldsPrecedesActions(schema, nodesById, outgoing),
    );
    errors.push(...validateConditionBranchEdges(schema, nodesById));
    warnings.push(...validateRedirectDownstream(schema));
  }

  for (const node of schema.nodes) {
    if (node.type === "trigger") {
      if (!node.config.trackerSchemaId || !node.config.event) {
        errors.push({
          code: "INCOMPLETE_CONFIG",
          message: `Trigger node "${node.label || node.id}" is not fully configured`,
          nodeId: node.id,
        });
      }
      if (!v2 && !node.config.gridId) {
        errors.push({
          code: "INCOMPLETE_CONFIG",
          message: `Trigger node "${node.label || node.id}" requires a grid (V1)`,
          nodeId: node.id,
        });
      }
    }

    if (node.type === "action") {
      if (!node.config.trackerSchemaId || !node.config.actionType) {
        errors.push({
          code: "INCOMPLETE_CONFIG",
          message: `Action node "${node.label || node.id}" is not fully configured`,
          nodeId: node.id,
        });
      }
      if (!v2 && !node.config.gridId) {
        errors.push({
          code: "INCOMPLETE_CONFIG",
          message: `Action node "${node.label || node.id}" requires a grid (V1)`,
          nodeId: node.id,
        });
      }

      if (
        (node.config.actionType === "delete_row" ||
          node.config.actionType === "update_row") &&
        !node.config.whereClause
      ) {
        errors.push({
          code: "MISSING_WHERE_CLAUSE",
          message: `Action node "${node.label || node.id}" requires a where clause for ${node.config.actionType}`,
          nodeId: node.id,
        });
      }
    }

    if (node.type === "condition") {
      if (!node.config.condition) {
        errors.push({
          code: "MISSING_CONDITION",
          message: `Condition node "${node.label || node.id}" must have a condition expression`,
          nodeId: node.id,
        });
      }
    }

    if (node.type === "map_fields") {
      if (!node.config.mappings || node.config.mappings.length === 0) {
        errors.push({
          code: "EMPTY_MAPPINGS",
          message: `Map Fields node "${node.label || node.id}" must have at least one field mapping`,
          nodeId: node.id,
        });
      }
      if (!v2) {
        for (const m of node.config.mappings) {
          if (!m.target.gridId) {
            errors.push({
              code: "INCOMPLETE_CONFIG",
              message: `Map Fields "${node.label || node.id}" mapping must specify target grid (V1)`,
              nodeId: node.id,
            });
            break;
          }
        }
      }
    }

    if (!v2 && node.type === "redirect") {
      errors.push({
        code: "REDIRECT_V1_INVALID",
        message: "Redirect nodes are only allowed in version 2 workflows",
        nodeId: node.id,
      });
    }
  }

  const nodeIds = new Set(schema.nodes.map((n) => n.id));
  for (const edge of schema.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push({
        code: "INVALID_EDGE",
        message: "Workflow has edges connecting non-existent nodes",
      });
      break;
    }
  }

  const connectedNodes = new Set<string>();
  for (const edge of schema.edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }
  for (const node of schema.nodes) {
    if (node.type !== "trigger" && !connectedNodes.has(node.id)) {
      errors.push({
        code: "DISCONNECTED_NODE",
        message: `Node "${node.label || node.id}" is not connected to the workflow`,
        nodeId: node.id,
      });
    }
  }

  return { errors, warnings };
}

/** Infer branchType from React Flow sourceHandle when missing (V1 migration). */
export function normalizeWorkflowEdges(schema: WorkflowSchema): WorkflowSchema {
  const nodesById = new Map(schema.nodes.map((n) => [n.id, n]));
  const edges = schema.edges.map((edge) => {
    const src = nodesById.get(edge.source);
    if (src?.type !== "condition") return edge;
    if (edge.branchType) return edge;
    const h = edge.sourceHandle;
    if (h === "true" || h === "false") {
      return { ...edge, branchType: h as "true" | "false" };
    }
    return edge;
  });
  return { ...schema, edges };
}
