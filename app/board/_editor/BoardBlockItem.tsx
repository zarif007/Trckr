"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { BoardElement } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import {
  GRID_ITEM_WRAPPER,
  GRID_BLOCK_INNER,
} from "@/app/components/tracker-display/layout";
import { BlockControlsProvider } from "@/app/components/tracker-display/layout";
import { BoardBlockHeader } from "./BoardBlockHeader";
import { BoardBlockContent } from "./BoardBlockContent";

export interface BoardBlockItemProps {
  block: BoardElement;
  payload: BoardElementPayload | null;
  onRemove: () => void;
  onUpdate: (updater: (el: BoardElement) => BoardElement) => void;
}

export function BoardBlockItem({
  block,
  payload,
  onRemove,
  onUpdate,
}: BoardBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-40")}
    >
      <BlockControlsProvider
        value={{
          dragHandleProps: { ...attributes, ...listeners },
          onRemove,
          onAddBlockClick: undefined,
          isSortable: true,
          label: "",
        }}
      >
        <div className={GRID_ITEM_WRAPPER}>
          <div
            className={cn(
              GRID_BLOCK_INNER,
              "rounded-sm border",
              theme.uiChrome.border,
            )}
          >
            <BoardBlockHeader block={block} onUpdate={onUpdate} />
            <BoardBlockContent block={block} payload={payload} onUpdate={onUpdate} />
          </div>
        </div>
      </BlockControlsProvider>
    </div>
  );
}
