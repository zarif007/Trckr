"use client";

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  addEdge,
  useEdgesState,
  useNodesState,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type OnNodesChange,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import type { WorkflowSchema, WorkflowNode, WorkflowEdge } from "@/lib/workflows/types";
import { theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { TriggerNodeUI } from "./nodes/trigger-node";
import { ConditionNodeUI } from "./nodes/condition-node";
import { MapFieldsNodeUI } from "./nodes/map-fields-node";
import { ActionNodeUI } from "./nodes/action-node";
import { RedirectNodeUI } from "./nodes/redirect-node";

const nodeTypes = {
  trigger: TriggerNodeUI,
  condition: ConditionNodeUI,
  map_fields: MapFieldsNodeUI,
  action: ActionNodeUI,
  redirect: RedirectNodeUI,
};

const EDGE_STYLE: CSSProperties = {
  stroke: "hsl(var(--primary) / 0.6)",
  strokeWidth: 1.5,
  strokeLinecap: "round",
};
const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "hsl(var(--primary) / 0.7)",
  width: 14,
  height: 14,
};
const EDGE_DEFAULTS = {
  type: "default" as const,
  style: EDGE_STYLE,
  markerEnd: EDGE_MARKER,
};

interface WorkflowCanvasProps {
  schema: WorkflowSchema;
  onChange: (schema: WorkflowSchema) => void;
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string | null) => void;
  readOnly?: boolean;
  onAddNodeFromDrop?: (nodeType: string, position: { x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
}

type WorkflowRN = Node<{
  node: WorkflowNode;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}>;

function toReactNodes(
  nodes: WorkflowNode[],
  selectedNodeId: string | null | undefined,
  onDelete?: (id: string) => void,
  onDuplicate?: (id: string) => void,
): WorkflowRN[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position as { x: number; y: number },
    data: { node, onDelete, onDuplicate },
    selected: node.id === selectedNodeId,
    draggable: true,
  }));
}

function workflowEdgeFromReactEdge(e: Edge): WorkflowEdge {
  const data = e.data as { branchType?: "true" | "false" } | undefined;
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    branchType: data?.branchType ?? (e as unknown as WorkflowEdge).branchType,
  };
}

function toReactEdges(edges: WorkflowEdge[]) {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    data: { branchType: edge.branchType },
    ...EDGE_DEFAULTS,
  }));
}

function inferBranchTypeFromHandle(
  schema: WorkflowSchema,
  connection: Connection,
): "true" | "false" | undefined {
  if (!connection.source) return undefined;
  const src = schema.nodes.find((n) => n.id === connection.source);
  if (src?.type !== "condition") return undefined;
  const h = connection.sourceHandle;
  if (h === "true" || h === "false") return h;
  return undefined;
}

export function WorkflowCanvas({
  schema,
  onChange,
  selectedNodeId,
  onNodeSelect,
  readOnly = false,
  onAddNodeFromDrop,
  onDeleteNode,
  onDuplicateNode,
}: WorkflowCanvasProps) {
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  const initialNodes = useMemo(
    () =>
      toReactNodes(
        schema.nodes,
        selectedNodeId,
        readOnly ? undefined : onDeleteNode,
        readOnly ? undefined : onDuplicateNode,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync in effect below
    [schema.nodes, selectedNodeId, readOnly],
  );

  const initialEdges = useMemo(() => toReactEdges(schema.edges), [schema.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowRN["data"]>(
    initialNodes,
  );
  const [edges, setEdges] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(
      toReactNodes(
        schema.nodes,
        selectedNodeId,
        readOnly ? undefined : onDeleteNode,
        readOnly ? undefined : onDuplicateNode,
      ),
    );
  }, [
    schema.nodes,
    selectedNodeId,
    setNodes,
    readOnly,
    onDeleteNode,
    onDuplicateNode,
  ]);

  useEffect(() => {
    setEdges(toReactEdges(schema.edges));
  }, [schema.edges, setEdges]);

  const commitEdges = useCallback(
    (nextEdges: Edge[]) => {
      const wfEdges = nextEdges.map(workflowEdgeFromReactEdge);
      onChange({ ...schema, edges: wfEdges });
    },
    [onChange, schema],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        commitEdges(next);
        return next;
      });
    },
    [readOnly, setEdges, commitEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      if (!connection.source || !connection.target) return;

      const branchType =
        inferBranchTypeFromHandle(schema, connection) ??
        (connection.sourceHandle === "true" || connection.sourceHandle === "false"
          ? connection.sourceHandle
          : undefined);

      const newEdge: WorkflowEdge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        branchType,
      };

      setEdges((eds) => addEdge({ ...toReactEdges([newEdge])[0] }, eds));
      onChange({ ...schema, edges: [...schema.edges, newEdge] });
    },
    [readOnly, schema, onChange, setEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect],
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (readOnly) return;
      onChange({
        ...schema,
        nodes: schema.nodes.map((n) =>
          n.id === node.id
            ? {
                ...n,
                position: { ...n.position, x: node.position.x, y: node.position.y },
              }
            : n,
        ),
      });
    },
    [readOnly, schema, onChange],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readOnly || !onAddNodeFromDrop || !rfInstance.current) return;
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw) return;
      let parsed: { kind?: string; nodeType?: string } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (parsed.kind !== "workflow" || !parsed.nodeType) return;
      const position = rfInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onAddNodeFromDrop(parsed.nodeType, position);
    },
    [readOnly, onAddNodeFromDrop],
  );

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (readOnly) return;
      onNodesChange(changes);
    },
    [readOnly, onNodesChange],
  );

  return (
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes as never}
        edges={edges}
        nodeTypes={nodeTypes as never}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onInit={(inst) => {
          rfInstance.current = inst;
        }}
        fitView
        defaultEdgeOptions={EDGE_DEFAULTS}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        deleteKeyCode={readOnly ? null : "Backspace"}
        className="!bg-transparent h-full min-h-0 w-full min-w-0"
      >
        <Background
          gap={22}
          size={1}
          color="hsl(var(--foreground) / 0.14)"
          variant={BackgroundVariant.Dots}
        />
        <Controls
          showFitView
          showInteractive={!readOnly}
          className={cn(
            "!bottom-3 !left-3 !top-auto !right-auto !rounded-sm",
            theme.uiChrome.floating,
          )}
        />
      </ReactFlow>
    </div>
  );
}
