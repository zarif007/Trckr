"use client";

import { useMemo, useCallback, useState, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from "@dnd-kit/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import type { BoardDefinition, BoardElement } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import {
  buildRowsFromWidgets,
  rebuildWidgetsFromRows,
  findWidgetRowIndex,
} from "@/lib/boards/grid-layout-utils";
import {
  parseDropZoneId,
  getPointerCoordinates,
  getDropPlacementByPointer,
  type DropPlacement,
} from "@/lib/boards/board-drag-utils";
import { useBoardEditMode } from "../context/BoardEditModeContext";
import { BoardWidgetCell } from "./BoardWidgetCell";
import { BoardBlockCommandInput } from "../BoardBlockCommandInput";
import { cn } from "@/lib/utils";

interface DropIndicator {
  overId: string;
  placement: DropPlacement;
}

export interface BoardGridEditorProps {
  definition: BoardDefinition;
  data: Record<string, BoardElementPayload> | null;
  onDefinitionChange: (updater: (prev: BoardDefinition) => BoardDefinition) => void;
  onAddStat?: () => void;
  onAddTable?: () => void;
  onAddChart?: () => void;
  onAddText: () => void;
}

/**
 * Main grid-based board editor with drag-and-drop.
 * Renders widgets in a 12-column responsive grid.
 */
export function BoardGridEditor({
  definition,
  data,
  onDefinitionChange,
  onAddStat,
  onAddTable,
  onAddChart,
  onAddText,
}: BoardGridEditorProps) {
  const { editMode } = useBoardEditMode();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const dropIndicatorRef = useRef<DropIndicator | null>(null);
  dropIndicatorRef.current = dropIndicator;
  const lastOverIdRef = useRef<string | null>(null);

  // Build row structure
  const widgetsByRow = useMemo(() => {
    return buildRowsFromWidgets(definition.elements);
  }, [definition.elements]);

  const sortableIds = useMemo(
    () => definition.elements.map((w) => w.id),
    [definition.elements],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const collisionDetection = useCallback(
    (args: Parameters<typeof pointerWithin>[0]) => {
      const pointerCollisions = pointerWithin(args);
      return pointerCollisions.length ? pointerCollisions : closestCenter(args);
    },
    [],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    lastOverIdRef.current = String(event.active.id);
    setDropIndicator(null);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, over } = event;
    if (over?.id) lastOverIdRef.current = String(over.id);

    const overId = over?.id ? String(over.id) : lastOverIdRef.current;
    if (!overId || String(active.id) === overId) {
      setDropIndicator((prev) => (prev ? null : prev));
      return;
    }

    const zone = parseDropZoneId(overId);
    const pointer = getPointerCoordinates(event);
    const prevPlacement = dropIndicatorRef.current?.placement ?? null;
    const placement = zone?.placement ??
      getDropPlacementByPointer(event.over?.rect ?? null, pointer, prevPlacement);

    if (!placement) {
      setDropIndicator((prev) => (prev ? null : prev));
      return;
    }

    const targetWidgetId = zone?.widgetId ?? overId;

    const next = { overId: targetWidgetId, placement };
    setDropIndicator((prev) =>
      prev && prev.overId === next.overId && prev.placement === next.placement
        ? prev
        : next,
    );
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    setDropIndicator(null);

    const { active, over } = event;
    const overId = over?.id ? String(over.id) : lastOverIdRef.current;
    lastOverIdRef.current = null;

    if (!overId || active.id === overId) return;

    const activeId = String(active.id);
    const zone = parseDropZoneId(overId);
    const overWidgetId = zone?.widgetId ?? overId;

    const pointer = getPointerCoordinates(event);
    const prevPlacement = dropIndicatorRef.current?.placement ?? null;
    const placement = zone?.placement ??
      getDropPlacementByPointer(event.over?.rect ?? null, pointer, prevPlacement);

    if (!placement) return;

    // Apply drop logic
    onDefinitionChange((prev) => {
      const rows = buildRowsFromWidgets(prev.elements);
      const existingById = new Map(prev.elements.map((w) => [w.id, w]));

      const activeLoc = findWidgetRowIndex(rows, activeId);
      if (!activeLoc) return prev;

      const [activeWidget] = rows[activeLoc.rowIndex].splice(activeLoc.colIndex, 1);
      if (!activeWidget) return prev;

      // Remove empty row
      if (rows[activeLoc.rowIndex].length === 0) {
        rows.splice(activeLoc.rowIndex, 1);
      }

      const overLoc = findWidgetRowIndex(rows, overWidgetId);
      if (!overLoc) return prev;

      // Insert based on placement
      if (placement === "left" || placement === "right") {
        const targetRow = rows[overLoc.rowIndex];
        const insertIndex = placement === "left"
          ? overLoc.colIndex
          : overLoc.colIndex + 1;
        targetRow.splice(insertIndex, 0, activeWidget);
      } else {
        const insertRowIndex = placement === "above"
          ? overLoc.rowIndex
          : overLoc.rowIndex + 1;
        rows.splice(insertRowIndex, 0, [activeWidget]);
      }

      const nextWidgets = rebuildWidgetsFromRows(rows, existingById);
      return { ...prev, elements: nextWidgets };
    });
  }, [onDefinitionChange]);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    setDropIndicator(null);
    lastOverIdRef.current = null;
  }, []);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    onDefinitionChange((prev) => ({
      ...prev,
      elements: prev.elements.filter((w) => w.id !== widgetId),
    }));
  }, [onDefinitionChange]);

  const handleUpdateWidget = useCallback((
    widgetId: string,
    updater: (el: BoardElement) => BoardElement,
  ) => {
    onDefinitionChange((prev) => ({
      ...prev,
      elements: prev.elements.map((w) =>
        w.id === widgetId ? updater(w) : w,
      ),
    }));
  }, [onDefinitionChange]);

  const activeWidget = useMemo(() => {
    if (!activeDragId) return null;
    return definition.elements.find((w) => w.id === activeDragId) ?? null;
  }, [activeDragId, definition.elements]);

  // Render grid
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div className="flex flex-col gap-4 min-w-0">
          {widgetsByRow.length === 0 && (
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-sm">
              <p className="text-sm text-muted-foreground">
                No widgets yet. Use the command below to add one.
              </p>
            </div>
          )}

          {widgetsByRow.map((rowWidgets, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className={cn("grid grid-cols-12 gap-4 min-w-0")}
            >
              {rowWidgets.map((widget) => (
                <BoardWidgetCell
                  key={widget.id}
                  widget={widget}
                  payload={data?.[widget.id] ?? null}
                  dropIndicator={
                    dropIndicator?.overId === widget.id
                      ? dropIndicator.placement
                      : null
                  }
                  isDragging={activeDragId === widget.id}
                  onRemove={() => handleRemoveWidget(widget.id)}
                  onUpdate={(updater) => handleUpdateWidget(widget.id, updater)}
                />
              ))}
            </div>
          ))}

          {/* Add widget command input */}
          <div className="pt-2">
            <BoardBlockCommandInput
              onAddStat={onAddStat}
              onAddTable={onAddTable}
              onAddChart={onAddChart}
              onAddText={onAddText}
              placeholder="Add widget..."
            />
          </div>
        </div>
      </SortableContext>

      <DragOverlay>
        {activeWidget ? (
          <div className="flex flex-col w-full min-w-0 rounded-sm border bg-background p-3 opacity-80">
            <span className="text-sm font-medium">
              {activeWidget.title ?? activeWidget.type}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
