"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Save, Loader2, AlertCircle, PanelLeftClose, PanelLeftOpen, Trash2, Settings, X } from "lucide-react";
import type {
  WorkflowSchema,
  WorkflowNode,
  WorkflowEdge,
} from "@/lib/workflows/types";
import { validateWorkflowSchema } from "@/lib/workflows/validation";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowPalette } from "./workflow-palette";
import { TriggerConfig } from "./config-panels/trigger-config";
import { ConditionConfig } from "./config-panels/condition-config";
import { MapFieldsConfig } from "./config-panels/map-fields-config";
import { ActionConfig } from "./config-panels/action-config";

interface WorkflowBuilderProps {
  initialSchema?: WorkflowSchema;
  workflowId?: string;
  onSave: (schema: WorkflowSchema) => Promise<void>;
  /** All trackers available in the project */
  availableTrackers: { schemaId: string; name: string; grids?: { gridId: string; label: string }[] }[];
  /** Current tracker's fields (for expression builders) */
  currentTrackerFields?: { fieldId: string; label: string; dataType?: string }[];
  saving?: boolean;
  saveError?: string | null;
}

function emptySchema(): WorkflowSchema {
  return { version: 1, nodes: [], edges: [] };
}

export function WorkflowBuilder({
  initialSchema,
  workflowId,
  onSave,
  availableTrackers,
  currentTrackerFields = [],
  saving = false,
  saveError,
}: WorkflowBuilderProps) {
  const [schema, setSchema] = useState<WorkflowSchema>(initialSchema ?? emptySchema());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedNode = schema.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleAddNode = useCallback(
    (type: string) => {
      const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
      const existingCount = schema.nodes.filter((n) => n.type === type).length;
      const position = computeNodePosition(schema.nodes);

      const node: WorkflowNode = {
        id,
        type: type as WorkflowNode["type"],
        label: defaultNodeLabel(type, existingCount + 1),
        position,
        config: defaultNodeConfig(type),
      } as WorkflowNode;

      setSchema((prev) => ({ ...prev, nodes: [...prev.nodes, node] }));
      setSelectedNodeId(id);
      setConfigPanelOpen(true);
    },
    [schema.nodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setSchema((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        edges: prev.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        ),
      }));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
        setConfigPanelOpen(false);
      }
    },
    [selectedNodeId],
  );

  const handleNodeUpdate = useCallback(
    (updatedNode: WorkflowNode) => {
      setSchema((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
      }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    // Clear previous validation error
    setValidationError(null);

    // Validate workflow schema
    const errors = validateWorkflowSchema(schema);

    if (errors.length > 0) {
      // Show first error (or could show all)
      setValidationError(errors.map((e) => e.message).join("; "));
      return;
    }

    onSave(schema);
  }, [schema, onSave]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground/80">
            Workflow builder
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(saveError || validationError) && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{validationError || saveError}</span>
            </div>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className={cn("gap-1.5", theme.radius.sm)}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main: Palette + Canvas + Config Panel */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Palette Sidebar */}
        <div
          className={cn(
            "flex shrink-0 flex-col border bg-muted/20 overflow-hidden transition-all duration-200 h-full",
            theme.radius.md,
            theme.border.verySubtle,
            "w-[180px]",
          )}
        >
          <div className="px-3 py-2.5 border-b border-border/20">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Nodes
            </span>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto p-2.5 flex-1">
            <WorkflowPalette onAddNode={handleAddNode} />
          </div>
        </div>

        {/* Canvas Area */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden border bg-background/80",
            theme.radius.md,
            theme.border.subtleAlt,
          )}
        >
          <WorkflowCanvas
            schema={schema}
            onChange={setSchema}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
          />
        </div>

        {/* Config Panel */}
        {configPanelOpen && selectedNode && (
          <div
            className={cn(
              "flex shrink-0 w-80 flex-col border bg-muted/20 overflow-hidden transition-all duration-200",
              theme.radius.md,
              theme.border.verySubtle,
            )}
          >
            <ConfigPanelHeader
              nodeType={selectedNode.type}
              nodeLabel={selectedNode.label ?? selectedNode.type}
              onToggle={() => setConfigPanelOpen(false)}
              onDelete={() => handleDeleteNode(selectedNode.id)}
            />
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {selectedNode.type === "trigger" && (
                <TriggerConfig
                  node={selectedNode}
                  availableTrackers={availableTrackers}
                  availableGrids={
                    availableTrackers.find(
                      (t) => t.schemaId === selectedNode.config.trackerSchemaId,
                    )?.grids ?? []
                  }
                  onChange={handleNodeUpdate}
                />
              )}
              {selectedNode.type === "condition" && (
                <ConditionConfig
                  node={selectedNode}
                  availableFields={currentTrackerFields}
                  onChange={handleNodeUpdate}
                />
              )}
              {selectedNode.type === "map_fields" && (
                <MapFieldsConfig
                  node={selectedNode}
                  sourceFields={currentTrackerFields.map((f) => ({
                    sourceFieldId: f.fieldId,
                    label: f.label,
                  }))}
                  targetFields={
                    availableTrackers
                      .flatMap((t) => t.grids ?? [])
                      .map((g) => ({
                        targetFieldId: g.gridId,
                        label: g.label,
                      }))
                  }
                  onChange={handleNodeUpdate}
                />
              )}
              {selectedNode.type === "action" && (
                <ActionConfig
                  node={selectedNode}
                  availableNodes={schema.nodes.map((n) => ({
                    id: n.id,
                    label: n.label ?? n.type,
                    type: n.type,
                  }))}
                  availableGrids={
                    availableTrackers.flatMap((t) => t.grids ?? [])
                  }
                  availableFields={currentTrackerFields}
                  onChange={handleNodeUpdate}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigPanelHeader({
  nodeType,
  nodeLabel,
  onToggle,
  onDelete,
}: {
  nodeType: string;
  nodeLabel: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/20 px-3 py-2.5">
      <span className="text-xs font-semibold truncate capitalize">
        {nodeLabel.replace(/_/g, " ")}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete node"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-sm p-1 text-muted-foreground hover:bg-muted/60"
          title="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function defaultNodeLabel(type: string, count: number): string {
  const labels: Record<string, string> = {
    trigger: "Trigger",
    condition: "Condition",
    map_fields: "Map Fields",
    action: "Action",
  };
  return `${labels[type] ?? type} ${count}`;
}

function defaultNodeConfig(type: string) {
  switch (type) {
    case "trigger":
      return { trackerSchemaId: "", gridId: "", event: "row_create" as const };
    case "condition":
      return { condition: { op: "const", value: false } as any };
    case "map_fields":
      return { mappings: [] };
    case "action":
      return { actionType: "create_row" as const, trackerSchemaId: "", gridId: "" };
    default:
      return {};
  }
}

function computeNodePosition(existingNodes: WorkflowNode[]) {
  if (existingNodes.length === 0) {
    return { x: 100, y: 100 };
  }

  const positions = existingNodes.map((n) => ({
    x: n.position.x,
    y: n.position.y,
  }));

  const maxX = Math.max(...positions.map((p) => p.x));
  const nodesAtMaxX = positions.filter((p) => p.x === maxX);
  const highestY = Math.min(...nodesAtMaxX.map((p) => p.y));

  const nodeHeight = 120;
  const gap = 40;

  return { x: maxX, y: highestY + nodeHeight + gap };
}
