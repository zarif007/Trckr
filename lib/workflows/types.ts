import type { ExprNode } from "@/lib/functions/types";

export type WorkflowNodeType =
  | "trigger"
  | "condition"
  | "map_fields"
  | "action"
  | "redirect";

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

/** V1: gridId required. V2: omit gridId (tracker-wide trigger). */
export interface TriggerNode extends WorkflowNodeBase {
  type: "trigger";
  config: {
    trackerSchemaId: string;
    /** V1 only — identifies which grid’s row event fired. Omitted in V2. */
    gridId?: string;
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
    fieldId: string;
    /** V1 only — V2 uses primary grid on the target tracker at runtime. */
    gridId?: string;
  };
}

export interface MapFieldsNode extends WorkflowNodeBase {
  type: "map_fields";
  config: {
    mappings: FieldMappingEntry[];
  };
}

/** V1: gridId required. V2: omit — primary grid resolved at runtime. */
export interface ActionNode extends WorkflowNodeBase {
  type: "action";
  config: {
    actionType: WorkflowActionType;
    trackerSchemaId: string;
    gridId?: string;
    whereClause?: ExprNode;
    mapFieldsNodeId?: string;
  };
}

/** V2 only — emits inline redirect effect (e.g. after interactive save). */
export interface RedirectNode extends WorkflowNodeBase {
  type: "redirect";
  config: {
    kind: "url";
    value: string;
  };
}

export type WorkflowNode =
  | TriggerNode
  | ConditionNode
  | MapFieldsNode
  | ActionNode
  | RedirectNode;

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  branchType?: "true" | "false";
}

export interface WorkflowSchemaV1 {
  version: 1;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowSchemaV2 {
  version: 2;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export type WorkflowSchema = WorkflowSchemaV1 | WorkflowSchemaV2;

export function isWorkflowSchemaV2(
  schema: WorkflowSchema,
): schema is WorkflowSchemaV2 {
  return schema.version === 2;
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

export interface WorkflowInlineEffects {
  redirect?: { url: string };
}

export interface WorkflowExecutionContext {
  triggerData: WorkflowTriggerData;
  mappedData: Record<string, unknown>;
  nodeData: Record<string, Record<string, unknown>>;
  inlineEffects: WorkflowInlineEffects;
  /** Internal: holds the result of the last condition for branch routing */
  _lastConditionResult?: "true" | "false";
}
