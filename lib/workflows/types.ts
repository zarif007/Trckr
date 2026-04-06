import type { ExprNode } from "@/lib/functions/types";

export type WorkflowNodeType = "trigger" | "condition" | "map_fields" | "action";
export type WorkflowActionType = "create_row" | "update_row" | "delete_row";
export type WorkflowTriggerEvent =
  | "row_create"
  | "row_update"
  | "row_delete"
  | "field_change";

export interface WorkflowPosition {
  x: number;
  y: number;
}

export interface WorkflowNodeBase {
  id: string;
  type: WorkflowNodeType;
  position: WorkflowPosition;
  label?: string;
}

export interface TriggerNode extends WorkflowNodeBase {
  type: "trigger";
  config: {
    trackerSchemaId: string;
    gridId: string;
    event: WorkflowTriggerEvent;
    watchFields?: string[];
  };
}

export interface ConditionNode extends WorkflowNodeBase {
  type: "condition";
  config: {
    condition: ExprNode;
  };
}

export interface MapFieldSource {
  type: "field" | "expression";
  path?: string;
  expr?: ExprNode;
}

export interface FieldMappingEntry {
  id: string;
  source: MapFieldSource;
  target: {
    trackerSchemaId: string;
    gridId: string;
    fieldId: string;
  };
}

export interface MapFieldsNode extends WorkflowNodeBase {
  type: "map_fields";
  config: {
    mappings: FieldMappingEntry[];
  };
}

export interface ActionNode extends WorkflowNodeBase {
  type: "action";
  config: {
    actionType: WorkflowActionType;
    trackerSchemaId: string;
    gridId: string;
    whereClause?: ExprNode;
    mapFieldsNodeId?: string;
  };
}

export type WorkflowNode =
  | TriggerNode
  | ConditionNode
  | MapFieldsNode
  | ActionNode;

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  branchType?: "true" | "false";
}

export interface WorkflowSchema {
  version: 1;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowTriggerData {
  event: WorkflowTriggerEvent;
  trackerSchemaId: string;
  gridId: string;
  rowId: string;
  rowData: Record<string, unknown>;
  changedFields?: string[];
  previousRowData?: Record<string, unknown>;
}

export interface WorkflowExecutionContext {
  triggerData: WorkflowTriggerData;
  mappedData: Record<string, unknown>;
  nodeData: Record<string, Record<string, unknown>>;
  /** Internal: holds the result of the last condition for branch routing */
  _lastConditionResult?: "true" | "false";
}
