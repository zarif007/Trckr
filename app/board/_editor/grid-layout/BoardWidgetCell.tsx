"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { BoardElement } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import type { DropPlacement } from "@/lib/boards/board-drag-utils";
import { BlockControlsProvider } from "@/app/components/tracker-display/layout";
import { WidgetDropZones } from "./WidgetDropZones";
import { BoardBlockHeader } from "../BoardBlockHeader";
import { BoardBlockContent } from "../BoardBlockContent";

interface BoardWidgetCellProps {
  widget: BoardElement;
  payload: BoardElementPayload | null;
  dropIndicator: DropPlacement | null;
  isDragging: boolean;
  onRemove: () => void;
  onUpdate: (updater: (el: BoardElement) => BoardElement) => void;
}

/**
 * Individual widget wrapper with sizing, drag-drop, and drop zones.
 * Renders a widget in the board grid with proper column/row spanning.
 */
export function BoardWidgetCell({
  widget,
  payload,
  dropIndicator,
  isDragging: isDraggingProp,
  onRemove,
  onUpdate,
}: BoardWidgetCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDraggingSortable,
  } = useSortable({ id: widget.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${widget.colSpan ?? 6}`,
    gridRow: `span ${widget.rowSpan ?? 1}`,
  };

  const isDragging = isDraggingProp || isDraggingSortable;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative min-w-0 min-h-[200px]",
        isDragging && "opacity-40",
      )}
    >
      <BlockControlsProvider
        value={{
          dragHandleProps: { ...attributes, ...listeners },
          onRemove,
          onAddBlockClick: undefined,
          isSortable: true,
          label: widget.title ?? widget.type,
        }}
      >
        <div
          className={cn(
            "h-full flex flex-col rounded-sm border bg-background",
            theme.uiChrome.border,
          )}
        >
          <BoardBlockHeader block={widget} onUpdate={onUpdate} onRemove={onRemove} />
          <BoardBlockContent block={widget} payload={payload} onUpdate={onUpdate} />
        </div>
      </BlockControlsProvider>

      {/* Drop zones for drag-and-drop */}
      <WidgetDropZones widgetId={widget.id} enabled />

      {/* Drop indicator lines */}
      {dropIndicator === "left" && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary/80 pointer-events-none" />
      )}
      {dropIndicator === "right" && (
        <span className="absolute inset-y-2 right-0 w-0.5 rounded-full bg-primary/80 pointer-events-none" />
      )}
      {dropIndicator === "above" && (
        <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-primary/80 pointer-events-none" />
      )}
      {dropIndicator === "below" && (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary/80 pointer-events-none" />
      )}
    </div>
  );
}
