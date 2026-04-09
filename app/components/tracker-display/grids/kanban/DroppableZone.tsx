"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

export interface DroppableEmptyColumnProps {
  id: string;
}

export function DroppableEmptyColumn({ id }: DroppableEmptyColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-24 items-center justify-center rounded-sm border-2 border-dashed transition-colors",
        isOver
          ? "border-primary/40 bg-primary/5"
          : cn(theme.border.gridChrome, "bg-muted/10"),
      )}
    >
      <p className="text-xs text-muted-foreground text-center px-4">
        Drop here
      </p>
    </div>
  );
}

export interface ColumnDropZoneProps {
  id: string;
}

export function ColumnDropZone({ id }: ColumnDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[80px] flex-shrink-0 items-center justify-center rounded-sm border-2 border-dashed transition-colors",
        isOver
          ? "border-primary bg-primary/10"
          : cn(theme.border.gridChrome, "bg-muted/10"),
      )}
    >
      <p className="text-xs text-muted-foreground">
        {isOver ? "Drop here" : ""}
      </p>
    </div>
  );
}
