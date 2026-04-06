/**
 * Workflow validation logic.
 * Validates workflow schemas before saving to catch configuration errors early.
 */

import type { WorkflowSchema } from "./types";

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
}

export function validateWorkflowSchema(
  schema: WorkflowSchema
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Must have exactly one trigger
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

  // All trigger nodes must be configured
  for (const node of schema.nodes) {
    if (node.type === "trigger") {
      if (!node.config.trackerSchemaId || !node.config.gridId) {
        errors.push({
          code: "INCOMPLETE_CONFIG",
          message: `Trigger node "${node.label || node.id}" is not fully configured`,
          nodeId: node.id,
        });
      }
      if (!node.config.event) {
        errors.push({
          code: "INCOMPLETE_CONFIG",
          message: `Trigger node "${node.label || node.id}" must specify an event type`,
          nodeId: node.id,
        });
      }
    }

    // Action nodes must be configured
    if (node.type === "action") {
      if (
        !node.config.trackerSchemaId ||
        !node.config.gridId ||
        !node.config.actionType
      ) {
        errors.push({
          code: "INCOMPLETE_CONFIG",
          message: `Action node "${node.label || node.id}" is not fully configured`,
          nodeId: node.id,
        });
      }

      // Delete and update actions must have where clause
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

    // Condition nodes must have a condition expression
    if (node.type === "condition") {
      if (!node.config.condition) {
        errors.push({
          code: "MISSING_CONDITION",
          message: `Condition node "${node.label || node.id}" must have a condition expression`,
          nodeId: node.id,
        });
      }
    }

    // Map fields nodes must have mappings
    if (node.type === "map_fields") {
      if (!node.config.mappings || node.config.mappings.length === 0) {
        errors.push({
          code: "EMPTY_MAPPINGS",
          message: `Map Fields node "${node.label || node.id}" must have at least one field mapping`,
          nodeId: node.id,
        });
      }
    }
  }

  // All edges must connect valid nodes
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

  // Check for disconnected nodes (excluding trigger)
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

  return errors;
}
