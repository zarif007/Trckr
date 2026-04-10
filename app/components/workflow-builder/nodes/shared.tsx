"use client";

import { memo, type ReactNode } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import { Copy, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

// ─── Product chrome (matches outline inputs / expr builder frames) ───

export const NODE_BASE_CLASSES = cn(
  "overflow-hidden rounded-sm border bg-background transition-all duration-150",
  theme.uiChrome.border,
);
export const NODE_HEADER_CLASSES = cn(
  "relative flex items-center gap-2 px-2.5 py-2 text-xs font-semibold border-b",
  theme.uiChrome.border,
);
export const NODE_BODY_CLASSES = "px-2.5 py-2";
export const NODE_ICON_CLASSES =
  "h-[22px] w-[22px] rounded-sm flex items-center justify-center flex-shrink-0";
export const NODE_DELETE_BUTTON_CLASSES =
  "nodrag inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors";
export const HANDLE_CLASSES =
  "!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-muted-foreground/30 hover:!border-primary hover:!bg-primary/20 transition-all duration-150";

// ─── Node accent color system ───

export interface NodeStyle {
  accent: string;
  iconBg: string;
  icon: ReactNode;
  label: string;
}

import { Database, GitBranch, ArrowLeftRight, Play, Link2 } from "lucide-react";

export const NODE_STYLES: Record<string, NodeStyle> = {
  trigger: {
    accent: "bg-blue-500",
    iconBg: "bg-blue-500/15",
    icon: <Database className="h-3.5 w-3.5 text-blue-600" />,
    label: "Trigger",
  },
  condition: {
    accent: "bg-indigo-500",
    iconBg: "bg-indigo-500/15",
    icon: <GitBranch className="h-3.5 w-3.5 text-indigo-600" />,
    label: "Condition",
  },
  map_fields: {
    accent: "bg-cyan-500",
    iconBg: "bg-cyan-500/15",
    icon: <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-600" />,
    label: "Map Fields",
  },
  action: {
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-500/15",
    icon: <Play className="h-3.5 w-3.5 text-emerald-600" />,
    label: "Action",
  },
  redirect: {
    accent: "bg-info",
    iconBg: theme.status.info.bg,
    icon: <Link2 className={cn("h-3.5 w-3.5", theme.status.info.text)} />,
    label: "Redirect",
  },
};

// ─── NodeContextMenu (matches ExprFlowBuilder) ───

export function NodeContextMenu({
  id,
  data,
  canDelete = true,
}: {
  id: string;
  data: WorkflowNodeData;
  canDelete?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(NODE_DELETE_BUTTON_CLASSES, "ml-auto")}
          aria-label="Node options"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-40 p-0", theme.uiChrome.floating)}
        align="end"
      >
        <div className="flex flex-col">
          {data.onDuplicate && (
            <button
              type="button"
              onClick={() => {
                data.onDuplicate?.(id);
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Duplicate</span>
            </button>
          )}
          {canDelete && data.onDelete && (
            <>
              {data.onDuplicate && (
                <div className={cn("border-t", theme.uiChrome.border)} />
              )}
              <button
                type="button"
                onClick={() => {
                  data.onDelete?.(id);
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Node wrapper with accent bar ───

export function NodeWrapper({
  children,
  canDelete = true,
}: {
  children: ReactNode;
  canDelete?: boolean;
}) {
  return (
    <div
      className={cn(
        NODE_BASE_CLASSES,
        "min-w-[200px]",
        "nodrag"
      )}
    >
      {children}
    </div>
  );
}

// ─── Node header with accent bar ───

export function NodeHeader({
  style,
  label,
  contextData,
  nodeId,
  canDelete = true,
}: {
  style: NodeStyle;
  label: string;
  contextData: WorkflowNodeData;
  nodeId: string;
  canDelete?: boolean;
}) {
  return (
    <div className={NODE_HEADER_CLASSES}>
      <div className={cn("h-[3px] w-full absolute left-0 top-0", style.accent)} />
      <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
        {style.icon}
      </span>
      <span className="text-foreground/80 font-medium text-xs flex-1 truncate">
        {label}
      </span>
      <NodeContextMenu id={nodeId} data={contextData} canDelete={canDelete} />
    </div>
  );
}

// ─── Handles ───

export function SourceHandle({ id, position = Position.Bottom }: { id: string; position?: Position }) {
  return (
    <Handle
      type="source"
      position={position}
      id={id}
      className={cn(HANDLE_CLASSES)}
    />
  );
}

export function TargetHandle({ id, position = Position.Top }: { id: string; position?: Position }) {
  return (
    <Handle
      type="target"
      position={position}
      id={id}
      className={cn(HANDLE_CLASSES)}
    />
  );
}

// ─── Node data type ───

export interface WorkflowNodeData {
  node?: {
    id: string;
    type: string;
    label?: string;
    config: Record<string, unknown>;
  };
  onChange?: (id: string, partial: Record<string, unknown>) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  availableFields?: Array<{ fieldId: string; label: string; dataType?: string }>;
}
