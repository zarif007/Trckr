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

export const RedirectNodeUI = memo(function RedirectNodeUI({
  id,
  data,
}: {
  id: string;
  data: WorkflowNodeData;
}) {
  const nodeData = data.node;
  const style = NODE_STYLES.redirect;
  const url =
    nodeData?.config?.kind === "url"
      ? String(nodeData.config.value ?? "").slice(0, 48)
      : "";

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
        <div className="text-[11px] text-muted-foreground truncate" title={url}>
          {url || "Set redirect URL"}
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
        id="out"
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-muted-foreground/30 hover:!border-primary hover:!bg-primary/20 transition-all duration-150"
      />
    </div>
  );
});
