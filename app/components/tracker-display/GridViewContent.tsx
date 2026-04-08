"use client";

import { useMemo, type RefObject } from "react";
import type {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  GridDataRecord,
} from "./types";
import type {
  FieldCalculationRule,
  FieldValidationRule,
} from "@/lib/functions/types";
import type { GridType } from "./types";
import type { FieldRulesMap } from "@/lib/field-rules";
import { TrackerTableGrid } from "./TrackerTableGrid";
import { TrackerKanbanGrid } from "./TrackerKanbanGrid";
import { TrackerDivGrid } from "./grids/div";

export interface GridViewContentProps {
  tabId: string;
  grid: TrackerGrid;
  view: {
    id?: string;
    type: GridType;
    name?: string;
    config?: TrackerGrid["config"];
  };
  gridLayoutNodes: TrackerLayoutNode[];
  allLayoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
  allGrids?: TrackerGrid[];
  allFields?: TrackerField[];
  bindings: TrackerBindings;
  validations?: Record<string, FieldValidationRule[]>;
  calculations?: Record<string, FieldCalculationRule>;
  fieldRulesV2?: FieldRulesMap;
  gridData?: Record<string, Array<Record<string, unknown>>>;
  gridDataRef?: RefObject<GridDataRecord> | null;
  gridDataForThisGrid?: Array<Record<string, unknown>>;
  readOnly?: boolean;
  onUpdate?: (
    gridId: string,
    rowIndex: number,
    columnId: string,
    value: unknown,
  ) => void;
  onAddEntry?: (gridId: string, newRow: Record<string, unknown>) => void;
  onDeleteEntries?: (gridId: string, rowIndices: number[]) => void;
}

/** Renders a single grid view (table, kanban, form/div, or placeholder for calendar/timeline). */
export function GridViewContent({
  tabId,
  grid,
  view,
  gridLayoutNodes,
  allLayoutNodes,
  fields,
  allGrids,
  allFields,
  bindings,
  validations,
  calculations,
  fieldRulesV2,
  gridData,
  gridDataRef,
  gridDataForThisGrid,
  readOnly,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: GridViewContentProps) {
  const gridId = grid.id;
  const g = useMemo(
    () => ({ ...grid, config: view.config ?? {} }),
    [grid, view.config],
  );
  const trackerContext = useMemo(
    () =>
      allGrids != null && allFields != null
        ? { grids: allGrids, fields: allFields }
        : undefined,
    [allGrids, allFields],
  );

  const updateCell = useMemo(
    () =>
      onUpdate && !readOnly
        ? (rowIndex: number, columnId: string, value: unknown) =>
            onUpdate(gridId, rowIndex, columnId, value)
        : undefined,
    [onUpdate, gridId, readOnly],
  );
  const addEntry = useMemo(
    () =>
      onAddEntry && !readOnly
        ? (newRow: Record<string, unknown>) => onAddEntry(gridId, newRow)
        : undefined,
    [onAddEntry, gridId, readOnly],
  );
  const deleteEntries = useMemo(
    () =>
      onDeleteEntries && !readOnly
        ? (rowIndices: number[]) => onDeleteEntries(gridId, rowIndices)
        : undefined,
    [onDeleteEntries, gridId, readOnly],
  );

  switch (view.type) {
    case "table":
      return (
        <TrackerTableGrid
          tabId={tabId}
          grid={g}
          layoutNodes={gridLayoutNodes}
          allLayoutNodes={allLayoutNodes}
          fields={fields}
          bindings={bindings}
          validations={validations}
          calculations={calculations}
          fieldRulesV2={fieldRulesV2}
          gridData={gridData}
          gridDataRef={gridDataRef}
          gridDataForThisGrid={gridDataForThisGrid}
          trackerContext={trackerContext}
          readOnly={readOnly}
          onUpdate={updateCell}
          onCrossGridUpdate={onUpdate}
          onAddEntry={addEntry}
          onAddEntryToGrid={onAddEntry}
          onDeleteEntries={deleteEntries}
        />
      );
    case "kanban":
      return (
        <TrackerKanbanGrid
          tabId={tabId}
          grid={g}
          layoutNodes={gridLayoutNodes}
          fields={fields}
          bindings={bindings}
          validations={validations}
          calculations={calculations}
          fieldRulesV2={fieldRulesV2}
          gridData={gridData}
          gridDataRef={gridDataRef}
          gridDataForThisGrid={gridDataForThisGrid}
          trackerContext={trackerContext}
          readOnly={readOnly}
          onUpdate={updateCell}
          onCrossGridUpdate={onUpdate}
          onAddEntry={addEntry}
          onDeleteEntries={deleteEntries}
        />
      );
    case "div":
      return (
        <TrackerDivGrid
          tabId={tabId}
          grid={g}
          layoutNodes={gridLayoutNodes}
          allLayoutNodes={allLayoutNodes}
          fields={fields}
          bindings={bindings}
          validations={validations}
          calculations={calculations}
          fieldRulesV2={fieldRulesV2}
          gridData={gridData}
          gridDataRef={gridDataRef}
          gridDataForThisGrid={gridDataForThisGrid}
          trackerContext={trackerContext}
          readOnly={readOnly}
          onUpdate={updateCell}
          onCrossGridUpdate={onUpdate}
          onAddEntryToGrid={onAddEntry}
        />
      );
    case "calendar":
      return (
        <div className="p-4 border border-dashed rounded-sm text-muted-foreground">
          Calendar Grid: {grid.name} (Not implemented)
        </div>
      );
    case "timeline":
      return (
        <div className="p-4 border border-dashed rounded-sm text-muted-foreground">
          Timeline Grid: {grid.name} (Not implemented)
        </div>
      );
    default:
      return null;
  }
}
