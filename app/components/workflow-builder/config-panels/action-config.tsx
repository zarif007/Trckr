"use client";

import type {
  ActionNode,
  WorkflowActionType,
} from "@/lib/workflows/types";
import type { ExprNode } from "@/lib/functions/types";
import { ExpressionBuilder } from "../expression-builder/expression-builder";

const ACTION_OPTIONS: { value: WorkflowActionType; label: string }[] = [
  { value: "create_row", label: "Create row" },
  { value: "update_row", label: "Update row" },
  { value: "delete_row", label: "Delete row" },
];

interface ActionConfigProps {
  node: ActionNode;
  availableNodes: { id: string; label: string; type: string }[];
  availableGrids: { gridId: string; label: string }[];
  availableFields: { fieldId: string; label: string; dataType?: string }[];
  onChange: (node: ActionNode) => void;
}

export function ActionConfig({
  node,
  availableNodes,
  availableGrids,
  availableFields,
  onChange,
}: ActionConfigProps) {
  const updateConfig = <K extends keyof ActionNode["config"]>(
    key: K,
    value: ActionNode["config"][K],
  ) => {
    onChange({ ...node, config: { ...node.config, [key]: value } });
  };

  const handleWhereClauseChange = (newExpr: ExprNode) => {
    updateConfig("whereClause", newExpr);
  };

  return (
    <div className="space-y-4">
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
        <label className="text-xs font-medium text-foreground/70">Target grid</label>
        <select
          value={node.config.gridId}
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
          <p className="mt-1 text-xs text-muted-foreground">
            Use mapped data from the selected Map Fields node.
          </p>
        </div>
      )}

      {(node.config.actionType === "delete_row" ||
        node.config.actionType === "update_row") && (
        <div>
          <label className="text-xs font-medium text-foreground/70">
            Where Clause
          </label>
          <p className="mt-1 text-xs text-muted-foreground mb-3">
            {node.config.actionType === "delete_row"
              ? "Rows matching this condition will be deleted."
              : "Rows matching this condition will be updated."}
          </p>
          {node.config.whereClause ? (
            <ExpressionBuilder
              value={node.config.whereClause}
              onChange={handleWhereClauseChange}
              availableFields={availableFields}
              mode="condition"
            />
          ) : (
            <div className="text-xs text-muted-foreground p-4 border border-dashed rounded">
              No where clause set. Click to add one.
              <button
                type="button"
                onClick={() =>
                  updateConfig("whereClause", {
                    op: "==",
                    left: { op: "field", fieldId: "" },
                    right: { op: "const", value: "" },
                  })
                }
                className="ml-2 text-primary underline"
              >
                Add where clause
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
