"use client";

import { type LucideIcon } from "lucide-react";
import {
  Database,
  GitBranch,
  ArrowLeftRight,
  Plus,
} from "lucide-react";

interface PaletteItemConfig {
  type: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

const PALETTE_ITEMS: PaletteItemConfig[] = [
  { type: "trigger", icon: Database, label: "Trigger", color: "text-blue-500" },
  { type: "condition", icon: GitBranch, label: "Condition", color: "text-amber-500" },
  { type: "map_fields", icon: ArrowLeftRight, label: "Map Fields", color: "text-emerald-500" },
  { type: "action", icon: Plus, label: "Action", color: "text-red-500" },
];

interface WorkflowPaletteProps {
  onAddNode: (type: string) => void;
  disabledTypes?: Set<string>;
}

export function WorkflowPalette({ onAddNode, disabledTypes }: WorkflowPaletteProps) {
  return (
    <div className="space-y-2">
      {PALETTE_ITEMS.map((item) => {
        const Icon = item.icon;
        const disabled = disabledTypes?.has(item.type) ?? false;
        return (
          <button
            key={item.type}
            type="button"
            disabled={disabled}
            onClick={() => onAddNode(item.type)}
            className="flex w-full items-center gap-2 rounded-sm border border-transparent bg-muted/30 px-2.5 py-2 text-left text-xs font-medium text-foreground/80 hover:border-foreground/10 hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
