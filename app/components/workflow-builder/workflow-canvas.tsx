"use client";

import { useCallback, useEffect, useMemo, type CSSProperties } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import type { WorkflowSchema, WorkflowNode, WorkflowEdge } from "@/lib/workflows/types";
import { TriggerNodeUI } from "./nodes/trigger-node";
import { ConditionNodeUI } from "./nodes/condition-node";
import { MapFieldsNodeUI } from "./nodes/map-fields-node";
import { ActionNodeUI } from "./nodes/action-node";

const nodeTypes = {
  trigger: TriggerNodeUI,
  condition: ConditionNodeUI,
  map_fields: MapFieldsNodeUI,
  action: ActionNodeUI,
};

// ─── Edge styling matches expression builder ───
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
}

type WorkflowRN = Node<{ node: WorkflowNode; [key: string]: unknown }>;

function toReactNodes(nodes: WorkflowNode[], selectedNodeId?: string | null): WorkflowRN[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position as { x: number; y: number },
    data: { node },
    selected: node.id === selectedNodeId,
  }));
}

function toReactEdges(edges: WorkflowEdge[]) {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    branchType: edge.branchType,
    ...EDGE_DEFAULTS,
  }));
}

export function WorkflowCanvas({
  schema,
  onChange,
  selectedNodeId,
  onNodeSelect,
}: WorkflowCanvasProps) {
  const initialNodes = useMemo(
    () => toReactNodes(schema.nodes, selectedNodeId),
    [schema.nodes, selectedNodeId]
  );
  const initialEdges = useMemo(() => toReactEdges(schema.edges), [schema.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowRN["data"]>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Only sync FROM props TO state — never the reverse during drag
  useEffect(() => {
    setNodes(toReactNodes(schema.nodes, selectedNodeId));
  }, [schema.nodes, selectedNodeId, setNodes]);

  useEffect(() => {
    setEdges(toReactEdges(schema.edges));
  }, [schema.edges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: WorkflowEdge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      };

      setEdges((eds) => addEdge({ ...newEdge, ...EDGE_DEFAULTS }, eds));

      onChange({ ...schema, edges: [...schema.edges, newEdge] });
    },
    [schema, onChange, setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onChange({
        ...schema,
        nodes: schema.nodes.map((n) =>
          n.id === node.id ? { ...n, position: { ...n.position, x: node.position.x, y: node.position.y } } : n
        ),
      });
    },
    [schema, onChange]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes as any}
        edges={edges}
        nodeTypes={nodeTypes as any}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        defaultEdgeOptions={EDGE_DEFAULTS}
        className="!bg-transparent h-full min-h-0 w-full min-w-0"
      >
        <Background gap={22} size={1} color="hsl(var(--foreground) / 0.14)" variant={BackgroundVariant.Dots} />
        <Controls
          showFitView
          showInteractive
          className="!bottom-3 !left-3 !top-auto !right-auto !bg-background !border-border/50 !rounded-sm"
        />
      </ReactFlow>
    </div>
  );
}
