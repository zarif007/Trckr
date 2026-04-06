"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { Node } from "reactflow";
import { cn } from "@/lib/utils";
import { type WorkflowNodeData, NODE_BASE_CLASSES, NODE_HEADER_CLASSES, NODE_BODY_CLASSES, NODE_ICON_CLASSES } from "./shared";
import { Database } from "lucide-react";
import { NODE_STYLES, NodeContextMenu } from "./shared";

const EVENT_LABELS: Record<string, string> = {
  row_create: "Row created",
  row_update: "Row updated",
  row_delete: "Row deleted",
  field_change: "Field changed",
};

export const TriggerNodeUI = memo(function TriggerNodeUI({ id, data }: { id: string; data: WorkflowNodeData }) {
  const nodeData = data.node;
  const style = NODE_STYLES.trigger;
  const event =
    typeof nodeData?.config?.event === "string" ? nodeData.config.event : undefined;

  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[200px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="text-foreground/80 font-medium text-xs flex-1 truncate">
          {nodeData?.label ?? style.label}
        </span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div className={NODE_BODY_CLASSES}>
        {event && (
          <div className="text-[11px] text-muted-foreground">
            <span className="text-muted-foreground/60">When:</span>{" "}
            {EVENT_LABELS[event] ?? event}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-muted-foreground/30 hover:!border-primary hover:!bg-primary/20 transition-all duration-150"
      />
    </div>
  );
});
