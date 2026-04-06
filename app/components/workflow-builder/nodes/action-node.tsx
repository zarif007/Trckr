"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Play, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type WorkflowNodeData,
  NODE_BASE_CLASSES,
  NODE_HEADER_CLASSES,
  NODE_BODY_CLASSES,
  NODE_ICON_CLASSES,
  type NodeStyle,
  NodeContextMenu,
} from "./shared";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create_row: <Plus className="h-3.5 w-3.5 text-emerald-600" />,
  update_row: <Pencil className="h-3.5 w-3.5 text-emerald-600" />,
  delete_row: <Trash2 className="h-3.5 w-3.5 text-emerald-600" />,
};

const ACTION_LABELS: Record<string, string> = {
  create_row: "Create Row",
  update_row: "Update Row",
  delete_row: "Delete Row",
};

const DEFAULT_STYLE: NodeStyle = {
  accent: "bg-emerald-500",
  iconBg: "bg-emerald-500/15",
  icon: <Play className="h-3.5 w-3.5 text-emerald-600" />,
  label: "Action",
};

export const ActionNodeUI = memo(function ActionNodeUI({
  id,
  data,
}: {
  id: string;
  data: WorkflowNodeData;
}) {
  const nodeData = data.node;
  const actionType = (nodeData?.config?.actionType as string) ?? "create_row";
  const icon = ACTION_ICONS[actionType] ?? ACTION_ICONS.create_row;
  const actionLabel = ACTION_LABELS[actionType] ?? actionType;

  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[200px]")}>
      <div className={cn("h-[3px] w-full", DEFAULT_STYLE.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, DEFAULT_STYLE.iconBg)}>
          {icon}
        </span>
        <span className="text-foreground/80 font-medium text-xs flex-1 truncate">
          {nodeData?.label ?? actionLabel}
        </span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div className={NODE_BODY_CLASSES}>
        <div className="text-[11px] text-muted-foreground">
          <div>{actionLabel}</div>
          {nodeData?.config?.whereClause != null && (
            <div className="text-[10px] text-muted-foreground/60">With condition</div>
          )}
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-muted-foreground/30 hover:!border-primary hover:!bg-primary/20 transition-all duration-150"
      />
    </div>
  );
});
