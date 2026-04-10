"use client";

import { type LucideIcon } from "lucide-react";
import {
  Database,
  GitBranch,
  ArrowLeftRight,
  Plus,
  Link2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

interface PaletteItemConfig {
  type: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

const PALETTE_ITEMS: PaletteItemConfig[] = [
  { type: "trigger", icon: Database, label: "Trigger", color: "text-blue-500" },
  {
    type: "condition",
    icon: GitBranch,
    label: "IF",
    color: "text-amber-500",
  },
  {
    type: "map_fields",
    icon: ArrowLeftRight,
    label: "Map Fields",
    color: "text-emerald-500",
  },
  { type: "action", icon: Plus, label: "Action", color: "text-red-500" },
  { type: "redirect", icon: Link2, label: "Redirect", color: theme.status.info.text },
];

interface WorkflowPaletteProps {
  onAddNode: (type: string) => void;
  disabledTypes?: Set<string>;
  readOnly?: boolean;
}

export function WorkflowPalette({
  onAddNode,
  disabledTypes,
  readOnly = false,
}: WorkflowPaletteProps) {
  const makeDragStart = (nodeType: string) => (event: React.DragEvent) => {
    if (readOnly) return;
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ kind: "workflow", nodeType }),
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="space-y-2">
      {PALETTE_ITEMS.map((item) => {
        const Icon = item.icon;
        const disabled =
          readOnly || (disabledTypes?.has(item.type) ?? false);
        return (
          <div key={item.type} className="flex items-stretch gap-1">
            <button
              type="button"
              disabled={disabled}
              draggable={!disabled}
              onDragStart={makeDragStart(item.type)}
              className="flex h-9 w-8 shrink-0 items-center justify-center rounded-sm border border-transparent bg-muted/20 text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
              title="Drag onto canvas"
              aria-label={`Drag ${item.label}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAddNode(item.type)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-sm border border-transparent bg-muted/30 px-2.5 py-2 text-left text-xs font-medium text-foreground/80 transition-colors hover:border-input hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", item.color)} />
              <span className="truncate">{item.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
