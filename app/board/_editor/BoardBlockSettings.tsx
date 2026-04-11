"use client";

import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { BoardElement } from "@/lib/boards/board-definition";

export interface BoardBlockSettingsProps {
  block: BoardElement;
  onChange: (updater: (el: BoardElement) => BoardElement) => void;
  onClose: () => void;
}

export function BoardBlockSettings({
  block,
  onChange,
  onClose,
}: BoardBlockSettingsProps) {
  if (block.type === "text") {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground">
          Text blocks have no configuration. Edit content directly in the block.
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-h-[min(70vh,520px)] w-[min(100vw-2rem,20rem)] flex-col gap-3 overflow-y-auto p-3 sm:w-80">
      <p className="text-xs text-muted-foreground">
        Configuration for {block.type} blocks. Tracker/grid/field selection will be implemented in the full integration.
      </p>
    </div>
  );
}
