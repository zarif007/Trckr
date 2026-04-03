/**
 * Flow node card component with expandable inline config.
 */

"use client";

import { useContext } from "react";
import { ChevronDown, Settings, Trash2 } from "lucide-react";
import { Handle, Position } from "reactflow";
import { cn } from "@/lib/utils";
import { nodeKindLabel } from "./dynamic-function-graph";
import { getNodeSummary } from "./node-summary";
import { DynamicNodeCardInlineConfig } from "./node-config-editor";
import {
  HANDLE_CLASSES,
  NODE_BASE_CLASSES,
  NODE_CATEGORY_STYLES,
  NODE_DELETE_BUTTON_CLASSES,
  NODE_FALLBACK_STYLE,
  NODE_HEADER_CLASSES,
  NODE_ICON_CLASSES,
} from "./flow-builder-constants";
import { FlowBuilderContext } from "./flow-builder-context";
import type { FlowNodeData } from "./flow-builder-types";

export function DynamicNodeCard({ id, data }: { id: string; data: FlowNodeData }) {
  const ctx = useContext(FlowBuilderContext);
  const expanded = ctx?.expandedNodeId === id;
  const summary =
    ctx && getNodeSummary(data.kind, data.config ?? {}, ctx.grids, ctx.connectors);
  const onToggle = ctx && (() => ctx.setExpandedNodeId(expanded ? null : id));

  const style = NODE_CATEGORY_STYLES[data.kind] || NODE_FALLBACK_STYLE;
  const isDeletable =
    data.kind !== "control.start" && data.kind !== "output.options";

  return (
    <div className={cn(NODE_BASE_CLASSES, "min-w-[190px] max-w-[300px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="min-w-0 truncate text-foreground/80 font-medium">
          {nodeKindLabel(data.kind)}
        </span>
        {ctx && isDeletable && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggle?.();
            }}
            className="nodrag nopan shrink-0 rounded-sm p-1 hover:bg-muted/60 transition-colors ml-auto"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-foreground/50 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </button>
        )}
        {isDeletable && data.onDelete && (
          <button
            type="button"
            onClick={() => data.onDelete?.(id)}
            className={cn(
              NODE_DELETE_BUTTON_CLASSES,
              !isDeletable || !ctx ? "ml-auto" : "",
            )}
            aria-label="Delete node"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {summary ? (
        <div
          className="px-3 py-1.5 text-[11px] text-muted-foreground truncate border-t border-border/30"
          title={id}
        >
          {summary}
        </div>
      ) : null}
      {expanded && ctx && (
        <div className="border-t border-border/30 bg-muted/20 px-3 py-3 space-y-2 nodrag nopan">
          <DynamicNodeCardInlineConfig
            nodeId={id}
            kind={data.kind}
            config={data.config ?? {}}
            onConfigChange={ctx.updateNodeConfig}
            grids={ctx.grids}
            connectors={ctx.connectors}
            availableFields={ctx.availableFields}
            onOpenFilterExpr={ctx.openFilterExprDialog}
          />
        </div>
      )}
      <Handle type="target" position={Position.Left} className={HANDLE_CLASSES} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLASSES} />
    </div>
  );
}

export const nodeTypes = { dynamicNode: DynamicNodeCard } as const;
