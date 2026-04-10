"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { AlertCircle, Trash2, X } from "lucide-react";
import type {
  WorkflowSchema,
  WorkflowNode,
  FieldMappingEntry,
} from "@/lib/workflows/types";
import { isWorkflowSchemaV2 } from "@/lib/workflows/types";
import type { TrackerMetadata } from "@/lib/workflows/metadata";
import { validateWorkflowSchemaFull } from "@/lib/workflows/validation";
import { FlowBuilderLayout } from "@/lib/flow-builder/FlowBuilderLayout";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowPalette } from "./workflow-palette";
import { TriggerConfig } from "./config-panels/trigger-config";
import { ConditionConfig } from "./config-panels/condition-config";
import {
  MapFieldsConfig,
  type TargetFieldOption,
} from "./config-panels/map-fields-config";
import { ActionConfig } from "./config-panels/action-config";
import { RedirectConfig } from "./config-panels/redirect-config";
import type { AvailableField } from "@/app/components/tracker-display/edit-mode/expr/expr-types";

interface WorkflowBuilderProps {
  initialSchema?: WorkflowSchema;
  workflowId?: string;
  onSave: (schema: WorkflowSchema) => Promise<void>;
  availableTrackers: TrackerMetadata[];
  currentTrackerFields?: AvailableField[];
  saving?: boolean;
  saveError?: string | null;
  /** V1 and other non-editable schemas */
  readOnly?: boolean;
}

function emptySchema(): WorkflowSchema {
  return { version: 2, nodes: [], edges: [] };
}

function buildTargetFieldOptions(trackers: TrackerMetadata[]): TargetFieldOption[] {
  return trackers.flatMap((t) =>
    t.grids.flatMap((g) =>
      g.fields.map((f) => ({
        trackerSchemaId: t.schemaId,
        gridId: g.gridId,
        fieldId: f.fieldId,
        label: `${t.name} › ${g.label} › ${f.label}`,
      })),
    ),
  );
}

function watchFieldOptionsForTracker(
  trackers: TrackerMetadata[],
  trackerSchemaId: string,
): { fieldId: string; label: string }[] {
  const t = trackers.find((tr) => tr.schemaId === trackerSchemaId);
  if (!t) return [];
  return t.grids.flatMap((g) =>
    g.fields.map((f) => ({
      fieldId: f.fieldId,
      label: `${g.label} › ${f.label}`,
    })),
  );
}

function normalizeLabel(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildAutoSuggestedMappings(
  sourceFields: { sourceFieldId: string; label: string }[],
  targets: TargetFieldOption[],
  isV2: boolean,
): FieldMappingEntry[] {
  const out: FieldMappingEntry[] = [];
  const usedTargets = new Set<string>();
  for (const s of sourceFields) {
    const sn = normalizeLabel(s.label);
    const sid = normalizeLabel(s.sourceFieldId.split(".").pop() ?? s.sourceFieldId);
    const match = targets.find((t) => {
      const key = `${t.trackerSchemaId}:${t.fieldId}`;
      if (usedTargets.has(key)) return false;
      return (
        normalizeLabel(t.fieldId) === sid ||
        normalizeLabel(t.label).includes(sn) ||
        sn.length > 2 && normalizeLabel(t.label).includes(sn)
      );
    });
    if (match) {
      usedTargets.add(`${match.trackerSchemaId}:${match.fieldId}`);
      out.push({
        id: `mapping-${crypto.randomUUID()}`,
        source: { type: "field", path: s.sourceFieldId },
        target: {
          trackerSchemaId: match.trackerSchemaId,
          fieldId: match.fieldId,
          ...(isV2 ? {} : { gridId: match.gridId }),
        },
      });
    }
  }
  return out;
}

export function WorkflowBuilder({
  initialSchema,
  workflowId,
  onSave,
  availableTrackers,
  currentTrackerFields = [],
  saving = false,
  saveError,
  readOnly = false,
}: WorkflowBuilderProps) {
  const [schema, setSchema] = useState<WorkflowSchema>(
    initialSchema ?? emptySchema(),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (initialSchema) setSchema(initialSchema);
  }, [initialSchema]);

  const isV2 = isWorkflowSchemaV2(schema);
  const targetFieldOptions = useMemo(
    () => buildTargetFieldOptions(availableTrackers),
    [availableTrackers],
  );

  const triggerTrackerId =
    schema.nodes.find((n) => n.type === "trigger")?.config.trackerSchemaId ??
    "";

  const watchFieldOptions = useMemo(
    () => watchFieldOptionsForTracker(availableTrackers, triggerTrackerId),
    [availableTrackers, triggerTrackerId],
  );

  const sourceFieldsForMap = useMemo(
    () =>
      currentTrackerFields.map((f) => ({
        sourceFieldId: f.fieldId,
        label: f.label,
      })),
    [currentTrackerFields],
  );

  const selectedNode = schema.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const hasMapFieldsNode = useMemo(
    () => schema.nodes.some((n) => n.type === "map_fields"),
    [schema.nodes],
  );

  const paletteDisabled = useMemo(() => {
    const d = new Set<string>();
    if (schema.nodes.some((n) => n.type === "trigger")) d.add("trigger");
    return d;
  }, [schema.nodes]);

  const defaultNodeConfig = useCallback((type: string) => {
    switch (type) {
      case "trigger":
        return {
          trackerSchemaId: "",
          event: "row_create" as const,
        };
      case "condition":
        return { condition: { op: "const", value: false } as never };
      case "map_fields":
        return { mappings: [] };
      case "action":
        return {
          actionType: "create_row" as const,
          trackerSchemaId: "",
        };
      case "redirect":
        return { kind: "url" as const, value: "" };
      default:
        return {};
    }
  }, []);

  const defaultNodeLabel = useCallback((type: string, count: number) => {
    const labels: Record<string, string> = {
      trigger: "Trigger",
      condition: "IF",
      map_fields: "Map Fields",
      action: "Action",
      redirect: "Redirect",
    };
    return `${labels[type] ?? type} ${count}`;
  }, []);

  const computeNodePosition = useCallback((existingNodes: WorkflowNode[]) => {
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
  }, []);

  const addNodeCore = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
      const existingCount = schema.nodes.filter((n) => n.type === type).length;
      const pos = position ?? computeNodePosition(schema.nodes);

      const node = {
        id,
        type: type as WorkflowNode["type"],
        label: defaultNodeLabel(type, existingCount + 1),
        position: pos,
        config: defaultNodeConfig(type),
      } as WorkflowNode;

      setSchema((prev) => ({ ...prev, nodes: [...prev.nodes, node] }));
      setSelectedNodeId(id);
      setConfigPanelOpen(true);
    },
    [
      schema.nodes,
      computeNodePosition,
      defaultNodeConfig,
      defaultNodeLabel,
    ],
  );

  const handleAddNode = useCallback(
    (type: string) => {
      if (readOnly) return;
      addNodeCore(type);
    },
    [readOnly, addNodeCore],
  );

  const handleAddNodeFromDrop = useCallback(
    (nodeType: string, position: { x: number; y: number }) => {
      if (readOnly) return;
      if (nodeType === "trigger" && schema.nodes.some((n) => n.type === "trigger"))
        return;
      addNodeCore(nodeType, position);
    },
    [readOnly, schema.nodes, addNodeCore],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
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
    [readOnly, selectedNodeId],
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      const original = schema.nodes.find((n) => n.id === nodeId);
      if (!original || original.type === "trigger") return;
      const id = `${original.type}-${crypto.randomUUID().slice(0, 8)}`;
      const copy = {
        ...original,
        id,
        position: {
          x: original.position.x + 48,
          y: original.position.y + 48,
        },
        label: `${original.label ?? original.type} (copy)`,
      } as WorkflowNode;
      setSchema((prev) => ({ ...prev, nodes: [...prev.nodes, copy] }));
      setSelectedNodeId(id);
      setConfigPanelOpen(true);
    },
    [readOnly, schema.nodes],
  );

  const handleNodeUpdate = useCallback(
    (updatedNode: WorkflowNode) => {
      if (readOnly) return;
      setSchema((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
      }));
    },
    [readOnly],
  );

  const handleAutoSuggestMap = useCallback(() => {
    if (readOnly || selectedNode?.type !== "map_fields") return;
    const next = buildAutoSuggestedMappings(
      sourceFieldsForMap,
      targetFieldOptions,
      isV2,
    );
    if (next.length === 0) return;
    handleNodeUpdate({
      ...selectedNode,
      config: { ...selectedNode.config, mappings: next },
    });
  }, [
    readOnly,
    selectedNode,
    sourceFieldsForMap,
    targetFieldOptions,
    isV2,
    handleNodeUpdate,
  ]);

  const handleSave = useCallback(async () => {
    setValidationError(null);
    setValidationWarnings([]);
    const { errors, warnings } = validateWorkflowSchemaFull(schema);
    if (errors.length > 0) {
      setValidationError(errors.map((e) => e.message).join("; "));
      return;
    }
    setValidationWarnings(warnings.map((w) => w.message));
    await onSave(schema);
  }, [schema, onSave]);

  const trackersForSelect = useMemo(
    () =>
      availableTrackers.map((t) => ({
        schemaId: t.schemaId,
        name: t.name,
        grids: t.grids.map((g) => ({
          gridId: g.gridId,
          label: g.label,
        })),
      })),
    [availableTrackers],
  );

  const canvas = (
    <WorkflowCanvas
      schema={schema}
      onChange={readOnly ? () => {} : setSchema}
      selectedNodeId={selectedNodeId}
      onNodeSelect={(id) => {
        setSelectedNodeId(id);
        setConfigPanelOpen(id != null);
      }}
      readOnly={readOnly}
      onAddNodeFromDrop={readOnly ? undefined : handleAddNodeFromDrop}
      onDeleteNode={readOnly ? undefined : handleDeleteNode}
      onDuplicateNode={readOnly ? undefined : handleDuplicateNode}
    />
  );

  const palette = (
    <WorkflowPalette
      onAddNode={handleAddNode}
      disabledTypes={paletteDisabled}
      readOnly={readOnly}
    />
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      {readOnly && (
        <div
          className={cn(
            "flex items-center gap-2 border px-3 py-2 text-sm text-muted-foreground",
            theme.radius.md,
            theme.uiChrome.border,
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
          <span>
            This workflow uses <strong>version 1</strong> and is read-only.
            Create a new workflow or contact support to migrate to{" "}
            <strong>version 2</strong>.
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-h-0 min-w-0 flex-1">
          {readOnly ? (
            <div
              className={cn(
                "flex h-full min-h-[480px] flex-col gap-3 border bg-card/50 p-4",
                theme.radius.md,
                theme.border.subtleAlt,
              )}
            >
              <div className="flex min-h-0 flex-1 gap-3">
                <div
                  className={cn(
                    "flex w-[180px] shrink-0 flex-col overflow-hidden border bg-muted/30",
                    theme.radius.md,
                    theme.uiChrome.border,
                  )}
                >
                  <div
                    className={cn(
                      "px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-b",
                      theme.uiChrome.border,
                    )}
                  >
                    Nodes
                  </div>
                  <div className="flex-1 overflow-y-auto p-2.5">
                    {palette}
                  </div>
                </div>
                <div
                  className={cn(
                    "min-h-0 min-w-0 flex-1 overflow-hidden border bg-background/80",
                    theme.radius.md,
                    theme.uiChrome.border,
                  )}
                >
                  {canvas}
                </div>
              </div>
            </div>
          ) : (
            <FlowBuilderLayout
              headerText="Drag nodes from the palette, connect handles, configure on the right, then Save."
              palette={palette}
              canvasMinHeight="min(70vh, 640px)"
              containerHeight="min(70vh, 640px)"
              applyError={validationError || saveError || null}
              onApply={() => {
                void handleSave();
              }}
              applyLabel={saving ? "Saving…" : "Save workflow"}
              applySuccess={false}
              paletteClassName="w-[200px]"
            >
              {canvas}
            </FlowBuilderLayout>
          )}
        </div>

        {configPanelOpen && selectedNode && (
          <div
            className={cn(
              "flex w-80 shrink-0 flex-col overflow-hidden border bg-muted/20",
              theme.radius.md,
              theme.uiChrome.border,
            )}
          >
            <ConfigPanelHeader
              nodeLabel={selectedNode.label ?? selectedNode.type}
              readOnly={readOnly}
              onToggle={() => setConfigPanelOpen(false)}
              onDelete={() => handleDeleteNode(selectedNode.id)}
            />
            <div className="flex-1 space-y-4 overflow-y-auto p-3">
              {selectedNode.type === "trigger" && (
                <TriggerConfig
                  node={selectedNode}
                  availableTrackers={trackersForSelect}
                  availableGrids={
                    trackersForSelect.find(
                      (t) => t.schemaId === selectedNode.config.trackerSchemaId,
                    )?.grids ?? []
                  }
                  isV2={isV2}
                  watchFieldOptions={watchFieldOptions}
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
                  sourceFields={sourceFieldsForMap}
                  targetFieldOptions={targetFieldOptions}
                  availableFields={currentTrackerFields}
                  isV2={isV2}
                  onChange={handleNodeUpdate}
                  onAutoSuggest={handleAutoSuggestMap}
                />
              )}
              {selectedNode.type === "action" && (
                <ActionConfig
                  node={selectedNode}
                  availableTrackers={trackersForSelect}
                  availableNodes={schema.nodes.map((n) => ({
                    id: n.id,
                    label: n.label ?? n.type,
                    type: n.type,
                  }))}
                  availableGrids={trackersForSelect.flatMap((t) => t.grids ?? [])}
                  availableFields={currentTrackerFields}
                  isV2={isV2}
                  hasMapFieldsNodeInWorkflow={hasMapFieldsNode}
                  onChange={handleNodeUpdate}
                />
              )}
              {selectedNode.type === "redirect" && (
                <RedirectConfig
                  node={selectedNode}
                  onChange={handleNodeUpdate}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {validationWarnings.length > 0 && !readOnly && (
        <div
          className={cn(
            "rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning",
          )}
        >
          {validationWarnings.join(" · ")}
        </div>
      )}

      {readOnly && (
        <p className="text-center text-xs text-muted-foreground">
          Workflow ID: {workflowId ?? "—"}
        </p>
      )}
    </div>
  );
}

function ConfigPanelHeader({
  nodeLabel,
  readOnly,
  onToggle,
  onDelete,
}: {
  nodeLabel: string;
  readOnly?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b px-3 py-2.5",
        theme.uiChrome.border,
      )}
    >
      <span className="truncate text-xs font-semibold capitalize">
        {nodeLabel.replace(/_/g, " ")}
      </span>
      <div className="flex items-center gap-1">
        {!readOnly && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete node"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
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

