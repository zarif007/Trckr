"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Database,
  FileJson,
  Filter,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  compileDynamicOptionFunctionGraph,
  type DynamicConnectorDef,
  type DynamicFunctionGraphDef,
  type DynamicFunctionGraphNode,
  type DynamicFunctionNodeKind,
  type DynamicOptionGraphFunctionDef,
} from "@/lib/dynamic-options";
import type { ExprNode } from "@/lib/functions/types";
import { normalizeExprNode } from "@/lib/schemas/expr";
import {
  DYNAMIC_NODE_PALETTE,
  type DynamicNodePaletteItem,
} from "./dynamic-function-graph";
import { ExprFlowBuilder } from "../expr/ExprFlowBuilder";
import type { AvailableField } from "../expr/expr-types";
import { FlowBuilderLayout } from "@/lib/flow-builder";
import { cn } from "@/lib/utils";
import { nodeTypes } from "./DynamicNodeCard";
import { FlowBuilderContext } from "./flow-builder-context";
import {
  FlowNode,
  FlowNodeData,
  defaultConfigForKind,
  groupPalette,
  toFlowNode,
  toGraphNode,
} from "./flow-builder-types";
import {
  EDGE_DEFAULTS,
  EDGE_STYLE,
  EDGE_MARKER,
  NODE_CATEGORY_STYLES,
} from "./flow-builder-constants";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_FILTER_EXPR: ExprNode = { op: "const", value: true };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DynamicFunctionFlowBuilder({
  value,
  grids,
  connectors,
  onChange,
  onValidationChange,
  availableFields = [],
}: {
  value: DynamicOptionGraphFunctionDef;
  grids: Array<{ id: string; name: string }>;
  connectors: Record<string, DynamicConnectorDef>;
  onChange: (nextGraph: DynamicFunctionGraphDef) => void;
  onValidationChange?: (state: { valid: boolean; errors: string[] }) => void;
  availableFields?: AvailableField[];
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [filterExprDialogOpen, setFilterExprDialogOpen] = useState(false);
  const [filterExprNodeId, setFilterExprNodeId] = useState<string | null>(null);
  const [filterExprDraft, setFilterExprDraft] =
    useState<ExprNode>(DEFAULT_FILTER_EXPR);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(
    value.graph.nodes.map((n) => toFlowNode(n, undefined)),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    value.graph.edges.map((edge) => ({
      ...EDGE_DEFAULTS,
      ...edge,
      style: EDGE_STYLE,
      markerEnd: EDGE_MARKER,
    })),
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const lastCompiledRef = useRef<ReturnType<
    typeof compileDynamicOptionFunctionGraph
  > | null>(null);
  const hasPatchedOnDelete = useRef(false);

  useEffect(() => {
    setNodes(value.graph.nodes.map((n) => toFlowNode(n, undefined)));
    setEdges(
      value.graph.edges.map((edge) => ({
        ...EDGE_DEFAULTS,
        ...edge,
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
      })),
    );
    setSelectedNodeId(null);
    setSelectedEdgeIds([]);
    setExpandedNodeId(null);
    hasPatchedOnDelete.current = false;
  }, [value.graph.edges, value.graph.nodes, setEdges, setNodes]);

  // Graph draft from current nodes/edges
  const graphDraft = useMemo<DynamicFunctionGraphDef>(
    () => ({
      entryNodeId: value.graph.entryNodeId,
      returnNodeId: value.graph.returnNodeId,
      nodes: (nodes as FlowNode[]).map(toGraphNode),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      })),
    }),
    [edges, nodes, value.graph.entryNodeId, value.graph.returnNodeId],
  );

  const compiled = useMemo(() => {
    if (isDraggingNode && lastCompiledRef.current) {
      return lastCompiledRef.current;
    }
    const next = compileDynamicOptionFunctionGraph(
      { ...value, graph: graphDraft },
      Object.keys(connectors),
    );
    lastCompiledRef.current = next;
    return next;
  }, [connectors, graphDraft, isDraggingNode, value]);

  const errorNodeIds = useMemo(
    () =>
      new Set(compiled.errors.map((e) => e.nodeId).filter(Boolean) as string[]),
    [compiled.errors],
  );
  const errorEdgeIds = useMemo(
    () =>
      new Set(compiled.errors.map((e) => e.edgeId).filter(Boolean) as string[]),
    [compiled.errors],
  );

  const nodesWithValidation = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        className: errorNodeIds.has(n.id)
          ? cn(n.className, "!ring-2 !ring-destructive")
          : n.className,
      })),
    [nodes, errorNodeIds],
  );

  const edgesWithValidation = useMemo(
    () =>
      edges.map((e) =>
        errorEdgeIds.has(e.id)
          ? {
              ...e,
              style: { ...(e.style ?? {}), stroke: "hsl(var(--destructive))" },
              className: "stroke-destructive",
            }
          : e,
      ),
    [edges, errorEdgeIds],
  );

  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    onValidationChange?.({
      valid: compiled.ok,
      errors: compiled.errors.map((e) => e.message),
    });
  }, [compiled, onValidationChange]);

  const handleApply = useCallback(() => {
    setApplyError(null);
    if (!compiled.ok) {
      const first = compiled.errors[0]?.message ?? "Pipeline has errors.";
      setApplyError(first);
      return;
    }
    onChange(graphDraft);
  }, [compiled, graphDraft, onChange]);

  // Stable delete callback
  const deleteNodeRef = useRef<((id: string) => void) | undefined>(undefined);
  const deleteNode = useCallback(
    (nodeId: string) => {
      const targetNode = nodes.find((n: FlowNode) => n.id === nodeId);
      if (!targetNode || targetNode.data.locked) return;
      setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      setEdges((prev) =>
        prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [nodes, selectedNodeId, setEdges, setNodes],
  );
  deleteNodeRef.current = deleteNode;

  const stableDeleteNode = useCallback((id: string) => {
    deleteNodeRef.current?.(id);
  }, []);

  useEffect(() => {
    if (hasPatchedOnDelete.current) return;
    hasPatchedOnDelete.current = true;
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onDelete: n.data.locked ? undefined : stableDeleteNode,
        },
      })),
    );
  }, [setNodes, stableDeleteNode]);

  const isValidConnection = useCallback((connection: Connection) => {
    if (connection.source === connection.target) return false;
    return true;
  }, []);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((prev) => addEdge({ ...params, ...EDGE_DEFAULTS }, prev)),
    [setEdges],
  );

  const onSelectionChange = useCallback(
    (selection: OnSelectionChangeParams) => {
      const nodeId = selection.nodes.length > 0 ? selection.nodes[0]!.id : null;
      setSelectedNodeId(nodeId);
      setSelectedEdgeIds(selection.edges.map((edge) => edge.id));
    },
    [],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer.getData("application/reactflow");
      if (!payload || !rfInstance) return;
      let parsed: { kind?: DynamicFunctionNodeKind } = {};
      try {
        parsed = JSON.parse(payload);
      } catch {
        return;
      }
      const kind = parsed.kind;
      if (!kind) return;
      setNodes((prev) => {
        const hasStart = prev.some(
          (n) => (n.data as FlowNodeData).kind === "control.start",
        );
        const hasReturn = prev.some(
          (n) => (n.data as FlowNodeData).kind === "output.options",
        );
        if (kind === "control.start" && hasStart) return prev;
        if (kind === "output.options" && hasReturn) return prev;
        const position = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const id = `dyn_node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const isLocked = kind === "control.start" || kind === "output.options";
        const node: FlowNode = {
          id,
          type: "dynamicNode",
          position,
          data: {
            kind,
            config: defaultConfigForKind(kind, grids, connectors),
            locked: isLocked,
            onDelete: isLocked ? undefined : stableDeleteNode,
          },
          deletable: !isLocked,
        };
        return [...prev, node];
      });
    },
    [connectors, grids, rfInstance, setNodes, stableDeleteNode],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const updateNodeConfig = useCallback(
    (
      nodeId: string,
      updater: (config: Record<string, unknown>) => Record<string, unknown>,
    ) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: updater(node.data.config ?? {}),
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const deleteSelection = useCallback(() => {
    if (selectedNodeId) deleteNode(selectedNodeId);
    if (selectedEdgeIds.length > 0) {
      setEdges((prev) =>
        prev.filter((edge) => !selectedEdgeIds.includes(edge.id)),
      );
      setSelectedEdgeIds([]);
    }
  }, [deleteNode, selectedEdgeIds, selectedNodeId, setEdges]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
      }
    },
    [deleteSelection],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setEdges((prev) => prev.filter((e) => e.id !== edge.id));
    },
    [setEdges],
  );

  const openFilterExprDialog = useCallback((nodeId: string, expr: ExprNode) => {
    setFilterExprDraft(normalizeExprNode(expr));
    setFilterExprNodeId(nodeId);
    setFilterExprDialogOpen(true);
  }, []);

  const paletteByGroup = useMemo(() => groupPalette(DYNAMIC_NODE_PALETTE), []);
  const paletteGroupOrder = ["Control", "Source", "Transform", "AI"] as const;

  const flowBuilderContextValue = useMemo(
    () => ({
      expandedNodeId,
      setExpandedNodeId,
      updateNodeConfig,
      grids,
      connectors,
      availableFields,
      openFilterExprDialog,
      deleteNode,
    }),
    [
      expandedNodeId,
      updateNodeConfig,
      grids,
      connectors,
      availableFields,
      openFilterExprDialog,
      deleteNode,
    ],
  );

  const getGroupIcon = (group: string) => {
    switch (group) {
      case "Control":
        return <Settings className="h-3 w-3" />;
      case "Source":
        return <Database className="h-3 w-3" />;
      case "Transform":
        return <Filter className="h-3 w-3" />;
      case "AI":
        return <Sparkles className="h-3 w-3" />;
      default:
        return <FileJson className="h-3 w-3" />;
    }
  };

  const getGroupColor = (group: string) => {
    switch (group) {
      case "Control":
        return "border-green-200 bg-green-50/50 hover:bg-green-100/50 dark:border-green-500/30 dark:bg-green-500/10";
      case "Source":
        return "border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 dark:border-blue-500/30 dark:bg-blue-500/10";
      case "Transform":
        return "border-violet-200 bg-violet-50/50 hover:bg-violet-100/50 dark:border-violet-500/30 dark:bg-violet-500/10";
      case "AI":
        return "border-pink-200 bg-pink-50/50 hover:bg-pink-100/50 dark:border-pink-500/30 dark:bg-pink-500/10";
      default:
        return "border-border/60 bg-muted/30 hover:bg-muted/40";
    }
  };

  const paletteMinimal = (
    <div className="space-y-4">
      {paletteGroupOrder
        .filter((g) => paletteByGroup[g]?.length)
        .map((group) => (
          <div key={group} className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              {getGroupIcon(group)}
              {group}
            </p>
            <div className="space-y-1.5">
              {(paletteByGroup[group] ?? []).map((item) => (
                <div
                  key={item.kind}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/reactflow",
                      JSON.stringify({ kind: item.kind }),
                    );
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className={cn(
                    "cursor-grab rounded-sm border px-2.5 py-2 text-xs text-foreground/80 transition-all duration-150",
                    "active:cursor-grabbing active:scale-[0.98] hover:flex items-center gap-2",
                    getGroupColor(group),
                  )}
                  title={item.subtitle}
                >
                  {NODE_CATEGORY_STYLES[item.kind]?.icon || (
                    <Settings className="h-3.5 w-3.5" />
                  )}
                  <span className="font-medium truncate">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );

  return (
    <FlowBuilderContext.Provider value={flowBuilderContextValue}>
      <FlowBuilderLayout
        headerText="Drag nodes from the palette, connect them, then click Apply."
        headerRight={
          selectedNodeId || selectedEdgeIds.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={deleteSelection}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete selected
            </Button>
          ) : undefined
        }
        palette={paletteMinimal}
        canvasMinHeight="600px"
        applyError={applyError ?? null}
        onApply={handleApply}
        applyLabel="Apply visual pipeline"
        canvasClassName="min-h-0"
        paletteClassName="w-[120px]"
      >
        <div
          ref={wrapperRef}
          className="flex min-h-0 min-w-0 h-full min-h-[380px] w-full flex-1 flex-col"
        >
          <ReactFlow
            nodes={nodesWithValidation}
            edges={edgesWithValidation}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeContextMenu={onEdgeContextMenu}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={EDGE_DEFAULTS}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={EDGE_STYLE}
            isValidConnection={isValidConnection}
            fitView
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDragStart={() => setIsDraggingNode(true)}
            onNodeDragStop={() => setIsDraggingNode(false)}
            onSelectionChange={onSelectionChange}
            onKeyDown={onKeyDown}
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
              showInteractive
              className="!bottom-3 !left-3 !top-auto !right-auto !bg-background !border-border/50 !rounded-sm !"
            />
          </ReactFlow>
        </div>
      </FlowBuilderLayout>

      <Dialog open={filterExprDialogOpen} onOpenChange={setFilterExprDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Filter condition</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto">
            <ExprFlowBuilder
              expr={filterExprDraft}
              availableFields={availableFields}
              onChange={setFilterExprDraft}
              flowHeightClassName="h-[360px]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilterExprDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (filterExprNodeId) {
                  updateNodeConfig(filterExprNodeId, (config) => ({
                    ...config,
                    expr: filterExprDraft,
                  }));
                }
                setFilterExprDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FlowBuilderContext.Provider>
  );
}
