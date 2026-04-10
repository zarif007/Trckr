"use client";

import type {
  ActionNode,
  WorkflowActionType,
} from "@/lib/workflows/types";
import type { ExprNode } from "@/lib/functions/types";
import type { AvailableField } from "@/app/components/tracker-display/edit-mode/expr/expr-types";
import { ExprRuleEditor } from "@/app/components/tracker-display/edit-mode/expr/ExprRuleEditor";

const ACTION_OPTIONS: { value: WorkflowActionType; label: string }[] = [
  { value: "create_row", label: "Create row" },
  { value: "update_row", label: "Update row" },
  { value: "delete_row", label: "Delete row" },
];

const defaultWhere: ExprNode = {
  op: "==",
  left: { op: "field", fieldId: "" },
  right: { op: "const", value: "" },
};

interface ActionConfigProps {
  node: ActionNode;
  availableTrackers: { schemaId: string; name: string }[];
  availableNodes: { id: string; label: string; type: string }[];
  availableGrids: { gridId: string; label: string }[];
  availableFields: AvailableField[];
  isV2?: boolean;
  /** Hint when the graph has no map node (V2 still requires a path-level map; validation enforces). */
  hasMapFieldsNodeInWorkflow?: boolean;
  onChange: (node: ActionNode) => void;
}

export function ActionConfig({
  node,
  availableTrackers,
  availableNodes,
  availableGrids,
  availableFields,
  isV2 = false,
  hasMapFieldsNodeInWorkflow = true,
  onChange,
}: ActionConfigProps) {
  const updateConfig = <K extends keyof ActionNode["config"]>(
    key: K,
    value: ActionNode["config"][K],
  ) => {
    onChange({ ...node, config: { ...node.config, [key]: value } });
  };

  return (
    <div className="space-y-4">
      {isV2 && !hasMapFieldsNodeInWorkflow && (
        <div className="rounded-sm border border-warning/50 bg-warning/10 px-2 py-2 text-xs text-warning">
          Connect a <strong>Map Fields</strong> node before this action. V2
          requires mapped data on every path from the trigger.
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-foreground/70">Action</label>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {ACTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateConfig("actionType", opt.value)}
              className={`rounded-sm border px-2 py-1.5 text-xs font-medium transition-colors ${
                node.config.actionType === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground/70">
          Target tracker
        </label>
        <select
          value={node.config.trackerSchemaId}
          onChange={(e) => updateConfig("trackerSchemaId", e.target.value)}
          className="mt-1 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm focus:border-ring focus:outline-none"
        >
          <option value="">Select tracker...</option>
          {availableTrackers.map((t) => (
            <option key={t.schemaId} value={t.schemaId}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!isV2 && (
        <div>
          <label className="text-xs font-medium text-foreground/70">
            Target grid
          </label>
          <select
            value={node.config.gridId ?? ""}
            onChange={(e) => updateConfig("gridId", e.target.value)}
            className="mt-1 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm focus:border-ring focus:outline-none"
          >
            <option value="">Select grid...</option>
            {availableGrids.map((g) => (
              <option key={g.gridId} value={g.gridId}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {isV2 && (
        <p className="text-xs text-muted-foreground">
          Rows are written to this tracker&apos;s primary grid (first grid by
          layout order).
        </p>
      )}

      {node.config.actionType !== "create_row" && (
        <div>
          <label className="text-xs font-medium text-foreground/70">
            Map fields source
          </label>
          <select
            value={node.config.mapFieldsNodeId ?? ""}
            onChange={(e) =>
              updateConfig(
                "mapFieldsNodeId",
                e.target.value || undefined,
              )
            }
            className="mt-1 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm focus:border-ring focus:outline-none"
          >
            <option value="">Select map fields node...</option>
            {availableNodes
              .filter((n) => n.type === "map_fields")
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
          </select>
        </div>
      )}

      {(node.config.actionType === "delete_row" ||
        node.config.actionType === "update_row") && (
        <div>
          <label className="text-xs font-medium text-foreground/70">
            Where (filter rows)
          </label>
          <p className="mt-1 text-xs text-muted-foreground mb-3">
            {node.config.actionType === "delete_row"
              ? "Rows matching this expression are deleted."
              : "Rows matching this expression are updated."}
          </p>
          {node.config.whereClause ? (
            <ExprRuleEditor
              expr={node.config.whereClause}
              gridId="workflow"
              fieldId={`where_${node.id}`}
              availableFields={availableFields}
              mode="validation"
              onChange={(whereClause) => updateConfig("whereClause", whereClause)}
            />
          ) : (
            <button
              type="button"
              onClick={() => updateConfig("whereClause", defaultWhere)}
              className="text-xs text-primary underline"
            >
              Add where clause
            </button>
          )}
        </div>
      )}
    </div>
  );
}
