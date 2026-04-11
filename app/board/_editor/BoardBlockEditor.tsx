"use client";

import { useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import type { BoardDefinition, BoardElement } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import type { AssembledSchema } from "@/lib/boards/assembled-tracker-schema";
import type { TrackerSchema } from "@/app/dashboard/dashboard-context";
import { sortBoardElementsByDocumentOrder, getNextPlaceId } from "@/lib/boards/document-layout";
import {
  buildDefaultStatElement,
  buildDefaultTableElement,
  buildDefaultChartElement,
  buildDefaultTextElement,
} from "@/lib/boards/default-board-elements";
import { SECTION_STACK_GAP } from "@/app/components/tracker-display/layout";
import { BoardBlockItem } from "./BoardBlockItem";
import { BoardBlockCommandInput } from "./BoardBlockCommandInput";

export interface BoardBlockEditorProps {
  definition: BoardDefinition;
  data: Record<string, BoardElementPayload> | null;
  scopedTrackers: TrackerSchema[];
  schemaByTracker: Record<string, AssembledSchema | null>;
  onDefinitionChange: (updater: (prev: BoardDefinition) => BoardDefinition) => void;
  onSchemaNeeded: (trackerId: string) => void;
}

/**
 * Flat block editor for board/dashboard with drag-and-drop reordering.
 * Renders stat/table/chart/text blocks as a vertical list with inline editing.
 */
export function BoardBlockEditor({
  definition,
  data,
  scopedTrackers,
  schemaByTracker,
  onDefinitionChange,
  onSchemaNeeded,
}: BoardBlockEditorProps) {
  const sortedBlocks = useMemo(
    () => sortBoardElementsByDocumentOrder(definition.elements),
    [definition.elements],
  );

  const sortableIds = useMemo(
    () => sortedBlocks.map((b) => b.id),
    [sortedBlocks],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const oldIndex = sortedBlocks.findIndex((b) => b.id === activeId);
      const newIndex = sortedBlocks.findIndex((b) => b.id === overId);

      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(sortedBlocks, oldIndex, newIndex);

      const updated = reordered.map((block, index) => ({
        ...block,
        placeId: index,
      }));

      onDefinitionChange((prev) => ({
        ...prev,
        elements: updated,
      }));
    },
    [sortedBlocks, onDefinitionChange],
  );

  const handleRemoveBlock = useCallback(
    (blockId: string) => {
      onDefinitionChange((prev) => ({
        ...prev,
        elements: prev.elements.filter((el) => el.id !== blockId),
      }));
    },
    [onDefinitionChange],
  );

  const handleUpdateBlock = useCallback(
    (blockId: string, updater: (el: BoardElement) => BoardElement) => {
      onDefinitionChange((prev) => ({
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === blockId ? updater(el) : el,
        ),
      }));
    },
    [onDefinitionChange],
  );

  const handleAddStat = useCallback(() => {
    const firstTracker = scopedTrackers[0];
    if (!firstTracker) return;

    const schema = schemaByTracker[firstTracker.id];
    if (!schema) {
      onSchemaNeeded(firstTracker.id);
      return;
    }

    onDefinitionChange((prev) => {
      const placeId = getNextPlaceId(prev.elements);
      const el = buildDefaultStatElement(firstTracker.id, schema, placeId);
      if (!el) return prev;
      return { ...prev, elements: [...prev.elements, el] };
    });
  }, [scopedTrackers, schemaByTracker, onDefinitionChange, onSchemaNeeded]);

  const handleAddTable = useCallback(() => {
    const firstTracker = scopedTrackers[0];
    if (!firstTracker) return;

    const schema = schemaByTracker[firstTracker.id];
    if (!schema) {
      onSchemaNeeded(firstTracker.id);
      return;
    }

    onDefinitionChange((prev) => {
      const placeId = getNextPlaceId(prev.elements);
      const el = buildDefaultTableElement(firstTracker.id, schema, placeId);
      if (!el) return prev;
      return { ...prev, elements: [...prev.elements, el] };
    });
  }, [scopedTrackers, schemaByTracker, onDefinitionChange, onSchemaNeeded]);

  const handleAddChart = useCallback(() => {
    const firstTracker = scopedTrackers[0];
    if (!firstTracker) return;

    const schema = schemaByTracker[firstTracker.id];
    if (!schema) {
      onSchemaNeeded(firstTracker.id);
      return;
    }

    onDefinitionChange((prev) => {
      const placeId = getNextPlaceId(prev.elements);
      const el = buildDefaultChartElement(firstTracker.id, schema, placeId);
      if (!el) return prev;
      return { ...prev, elements: [...prev.elements, el] };
    });
  }, [scopedTrackers, schemaByTracker, onDefinitionChange, onSchemaNeeded]);

  const handleAddText = useCallback(() => {
    onDefinitionChange((prev) => {
      const placeId = getNextPlaceId(prev.elements);
      const el = buildDefaultTextElement(placeId);
      return { ...prev, elements: [...prev.elements, el] };
    });
  }, [onDefinitionChange]);

  const hasTrackers = scopedTrackers.length > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className={SECTION_STACK_GAP}>
          {sortedBlocks.map((block) => (
            <BoardBlockItem
              key={block.id}
              block={block}
              payload={data?.[block.id] ?? null}
              onRemove={() => handleRemoveBlock(block.id)}
              onUpdate={(updater) => handleUpdateBlock(block.id, updater)}
            />
          ))}

          <BoardBlockCommandInput
            onAddStat={hasTrackers ? handleAddStat : undefined}
            onAddTable={hasTrackers ? handleAddTable : undefined}
            onAddChart={hasTrackers ? handleAddChart : undefined}
            onAddText={handleAddText}
            placeholder={
              hasTrackers
                ? "Add block..."
                : "Add text block (no trackers available)..."
            }
          />
        </div>
      </SortableContext>
    </DndContext>
  );
}
