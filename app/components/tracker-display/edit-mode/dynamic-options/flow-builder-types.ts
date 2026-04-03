/**
 * Type aliases shared across the flow builder split files.
 */

import type { Node, Edge } from "reactflow";
import type { DynamicFunctionNodeKind, DynamicFunctionGraphNode, DynamicConnectorDef } from "@/lib/dynamic-options";

// Flow-node shape used by ReactFlow (extends Node with specific data)
export interface FlowNodeData {
  kind: DynamicFunctionNodeKind;
  config: Record<string, unknown>;
  locked?: boolean;
  onDelete?: (id: string) => void;
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;
export type FlowNodeWithValidation = FlowNode & { className?: string };
export type FlowEdgeWithValidation = FlowEdge & { className?: string };

// Conversion helpers (exported for the main builder to use)
export function toFlowNode(
  node: DynamicFunctionGraphNode,
  onDelete?: (id: string) => void,
): FlowNode {
  const isLocked =
    node.kind === "control.start" || node.kind === "output.options";
  return {
    id: node.id,
    type: "dynamicNode",
    position: node.position,
    data: {
      kind: node.kind,
      config: (node.config as Record<string, unknown>) ?? {},
      locked: isLocked,
      onDelete: isLocked ? undefined : onDelete,
    },
    deletable: !isLocked,
  };
}

export function toGraphNode(node: FlowNode): DynamicFunctionGraphNode {
  return {
    id: node.id,
    kind: node.data.kind,
    position: node.position,
    config: node.data.config,
  } as DynamicFunctionGraphNode;
}

export function groupPalette(
  items: Array<{ kind: DynamicFunctionNodeKind; group: string; title: string; subtitle: string }>,
): Record<string, Array<{ kind: DynamicFunctionNodeKind; group: string; title: string; subtitle: string }>> {
  return items.reduce<Record<string, Array<{ kind: DynamicFunctionNodeKind; group: string; title: string; subtitle: string }>>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});
}

export function defaultConfigForKind(
  kind: DynamicFunctionNodeKind,
  grids: Array<{ id: string }>,
  connectors: Record<string, DynamicConnectorDef>,
): Record<string, unknown> {
  const firstGrid = grids[0]?.id ?? "main_grid";
  const firstConnector = Object.keys(connectors)[0] ?? "api_connector";
  if (kind === "source.grid_rows") return { gridId: firstGrid };
  if (kind === "source.current_context") {
    return {
      includeRowValues: true,
      includeFieldMetadata: true,
      includeLayoutMetadata: false,
    };
  }
  if (kind === "source.layout_fields")
    return { includeHidden: false, excludeSharedTab: true };
  if (kind === "source.http_get")
    return { connectorId: firstConnector, path: "/", responsePath: "items" };
  if (kind === "transform.filter")
    return { mode: "and", predicates: [{ field: "", op: "eq", value: "" }] };
  if (kind === "transform.map_fields")
    return { mappings: { label: "name", value: "value" } };
  if (kind === "transform.unique") return { by: "value" };
  if (kind === "transform.sort")
    return { by: "label", direction: "asc", valueType: "string" };
  if (kind === "transform.limit") return { count: 100 };
  if (kind === "transform.flatten_path") return { path: "items" };
  if (kind === "ai.extract_options")
    return { prompt: "Extract option rows with label and value", maxRows: 200 };
  if (kind === "output.options")
    return { mapping: { label: "label", value: "value", id: "value" } };
  return {};
}
