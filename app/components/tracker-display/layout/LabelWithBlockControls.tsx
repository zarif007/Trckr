"use client";

import { useState, useCallback, type ReactNode } from "react";
import { GripVertical, Trash2, Plus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LabelWithBlockControlsProps {
  /** The label content (text, InlineEditableName, etc.) */
  label: ReactNode;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onAddBlockClick?: () => void;
  onSettings?: () => void;
  isSortable?: boolean;
  /** Optional class for the outer wrapper */
  className?: string;
}

/**
 * Inline label row that reveals drag/add/delete controls on hover.
 * When hidden, controls take zero space (no gap) so layout matches non-edit mode.
 */
export function LabelWithBlockControls({
  label,
  onRemove,
  dragHandleProps = {},
  onAddBlockClick,
  onSettings,
  isSortable = true,
  className,
}: LabelWithBlockControlsProps) {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  const showControls = hovered;

  const hasExtraControls = Boolean(onAddBlockClick || onSettings);
  const showGap = isSortable || hasExtraControls;

  return (
    <div
      className={cn(
        "flex items-center min-w-0 group",
        showGap && "gap-1.5",
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-0.5 shrink-0 min-w-0">
        {/* Drag handle: always visible when sortable (reduced opacity when not hovered) so it's discoverable and focusable for keyboard. */}
        {isSortable && (
          <button
            type="button"
            className={cn(
              "flex items-center justify-center h-6 w-6 rounded-sm shrink-0 transition-[color,opacity,transform] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
              "hover:bg-muted hover:scale-110 text-muted-foreground/50 hover:text-foreground",
              "cursor-grab active:cursor-grabbing active:scale-95",
              showControls ? "opacity-100" : "opacity-50",
            )}
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
        {/* Add + Remove: only visible on hover to avoid clutter. Smooth expand via max-width + opacity. */}
        <div
          className={cn(
            "flex items-center gap-0.5 overflow-hidden transition-[max-width,opacity] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
            showControls
              ? "max-w-[10rem] opacity-100"
              : "max-w-0 opacity-0 pointer-events-none",
          )}
        >
          {onAddBlockClick && (
            <button
              type="button"
              className="flex items-center justify-center h-6 w-6 rounded-sm shrink-0 transition-[color,transform,background-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:bg-muted text-muted-foreground/50 hover:text-foreground active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onAddBlockClick();
              }}
              aria-label="Add block below"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          {onSettings && (
            <button
              type="button"
              className="flex items-center justify-center h-6 w-6 rounded-sm shrink-0 transition-[color,transform,background-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:bg-muted text-muted-foreground/50 hover:text-foreground active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onSettings();
              }}
              aria-label="Field settings"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          <button
            type="button"
            className="flex items-center justify-center h-6 w-6 rounded-sm shrink-0 transition-[color,transform,background-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex-1 min-w-0">{label}</div>
    </div>
  );
}
