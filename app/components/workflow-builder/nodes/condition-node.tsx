"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@/lib/utils";
import {
  type WorkflowNodeData,
  NODE_BASE_CLASSES,
  NODE_HEADER_CLASSES,
  NODE_BODY_CLASSES,
  NODE_ICON_CLASSES,
  NODE_STYLES,
  NodeContextMenu,
} from "./shared";

export const ConditionNodeUI = memo(function ConditionNodeUI({
  id,
  data,
}: {
  id: string;
  data: WorkflowNodeData;
}) {
  const nodeData = data.node;
  const style = NODE_STYLES.condition;

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
        <div className="text-[11px] text-muted-foreground">
          Branches execution path
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-muted-foreground/30 hover:!border-primary hover:!bg-primary/20 transition-all duration-150"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-success/50 hover:!border-success hover:!bg-success/20 transition-all duration-150"
      />
      <div className="absolute bottom-1 right-2 text-[10px] font-medium text-success/70">
        True
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-destructive/50 hover:!border-destructive hover:!bg-destructive/20 transition-all duration-150"
      />
      <div className="absolute bottom-1 left-2 text-[10px] font-medium text-destructive/70">
        False
      </div>
    </div>
  );
});
