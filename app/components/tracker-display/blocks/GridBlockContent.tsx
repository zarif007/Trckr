"use client";

import { useState, useMemo, useCallback, type RefObject } from "react";
import type {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  GridDataRecord,
  TrackerGridView,
} from "../types";
import type {
  FieldCalculationRule,
  FieldValidationRule,
} from "@/lib/functions/types";
import type { FieldRulesMap } from "@/lib/field-rules";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GridViewContent } from "../GridViewContent";
import { normalizeGridViews } from "../view-utils";
import { useEditMode } from "../edit-mode";
import { ViewManager } from "../edit-mode/ViewManager";

export interface GridBlockContentProps {
  tabId: string;
  grid: TrackerGrid;
  layoutNodes: TrackerLayoutNode[];
  allLayoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
  allGrids?: TrackerGrid[];
  allFields?: TrackerField[];
  bindings: TrackerBindings;
  validations?: Record<string, FieldValidationRule[]>;
  calculations?: Record<string, FieldCalculationRule>;
  fieldRulesV2?: FieldRulesMap;
  gridData?: GridDataRecord;
  gridDataRef?: RefObject<GridDataRecord> | null;
  readOnly?: boolean;
  onUpdate?: (
    gridId: string,
    rowIndex: number,
    columnId: string,
    value: unknown,
  ) => void;
  onAddEntry?: (gridId: string, newRow: Record<string, unknown>) => void;
  onDeleteEntries?: (gridId: string, rowIndices: number[]) => void;
  /** When true, hide the grid name label (e.g. in BlockEditor where it is shown by the block wrapper). */
  hideLabel?: boolean;
}

/**
 * Renders a single grid: resolves views, shows view tabs if multiple views,
 * and delegates to GridViewContent for the actual grid rendering.
 *
 * Shared between TrackerSection (display mode) and BlockEditor (edit mode).
 */
export function GridBlockContent({
  tabId,
  grid,
  layoutNodes,
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
  readOnly,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
  hideLabel = false,
}: GridBlockContentProps) {
  const { editMode, schema, onSchemaChange } = useEditMode();
  const [activeViewId, setActiveViewId] = useState<string | undefined>();
  const [openAddColumnRequest, setOpenAddColumnRequest] = useState(0);

  const gridLayoutNodes = useMemo(
    () =>
      layoutNodes
        .filter((node) => node.gridId === grid.id)
        .sort((a, b) => a.order - b.order),
    [layoutNodes, grid.id],
  );
  const views = useMemo(() => normalizeGridViews(grid), [grid]);

  // Handle view changes in edit mode
  const handleViewsChange = useMemo(() => {
    if (!editMode || !schema || !onSchemaChange) return undefined;

    return (newViews: TrackerGridView[]) => {
      const updatedGrids = schema.grids?.map((g) =>
        g.id === grid.id ? { ...g, views: newViews } : g
      );
      onSchemaChange({ ...schema, grids: updatedGrids });
    };
  }, [editMode, schema, onSchemaChange, grid.id]);

  // Determine which view to show (for single view or when no active selection)
  const currentViewId = activeViewId ?? views[0]?.id;
  const currentView = views.find((v) => v.id === currentViewId) ?? views[0];

  const bumpAddColumn = useCallback(() => {
    setOpenAddColumnRequest((n) => n + 1);
  }, []);

  if (views.length === 1 && !handleViewsChange) {
    return (
      <div className="w-full min-w-0 space-y-2.5">
        {!hideLabel && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {grid.name}
            </label>
          </div>
        )}
        <GridViewContent
          tabId={tabId}
          grid={grid}
          view={views[0]}
          gridLayoutNodes={gridLayoutNodes}
          allLayoutNodes={allLayoutNodes}
          fields={fields}
          allGrids={allGrids}
          allFields={allFields}
          bindings={bindings}
          validations={validations}
          calculations={calculations}
          fieldRulesV2={fieldRulesV2}
          gridData={gridData}
          gridDataRef={gridDataRef}
          gridDataForThisGrid={gridData?.[grid.id] ?? []}
          readOnly={readOnly}
          onUpdate={onUpdate}
          onAddEntry={onAddEntry}
          onDeleteEntries={onDeleteEntries}
          openAddColumnRequest={openAddColumnRequest}
        />
      </div>
    );
  }

  // When in edit mode with view manager, use controlled view switching
  if (handleViewsChange) {
    return (
      <div className="w-full min-w-0 space-y-2.5">
        {hideLabel ? (
          <div className="flex w-full min-w-0 justify-end">
            <ViewManager
              grid={grid}
              fields={fields}
              layoutNodes={layoutNodes}
              onViewsChange={handleViewsChange}
              onActiveViewChange={setActiveViewId}
              activeViewId={currentViewId}
              onAddColumn={bumpAddColumn}
              addColumnDisabled={readOnly || !schema}
            />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2 w-full min-w-0">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider shrink min-w-0">
              {grid.name}
            </label>
            <ViewManager
              grid={grid}
              fields={fields}
              layoutNodes={layoutNodes}
              onViewsChange={handleViewsChange}
              onActiveViewChange={setActiveViewId}
              activeViewId={currentViewId}
              onAddColumn={bumpAddColumn}
              addColumnDisabled={readOnly || !schema}
            />
          </div>
        )}
        {currentView && (
          <GridViewContent
            tabId={tabId}
            grid={grid}
            view={currentView}
            gridLayoutNodes={gridLayoutNodes}
            allLayoutNodes={allLayoutNodes}
            fields={fields}
            allGrids={allGrids}
            allFields={allFields}
            bindings={bindings}
            validations={validations}
            calculations={calculations}
            fieldRulesV2={fieldRulesV2}
            gridData={gridData}
            gridDataRef={gridDataRef}
            gridDataForThisGrid={gridData?.[grid.id] ?? []}
            readOnly={readOnly}
            onUpdate={onUpdate}
            onAddEntry={onAddEntry}
            onDeleteEntries={onDeleteEntries}
            openAddColumnRequest={openAddColumnRequest}
            suppressEmbeddedAddColumn
          />
        )}
      </div>
    );
  }

  // Standard tabs for multiple views in view mode
  const defaultTab = views[0]?.id ?? `${grid.id}_view_0`;
  return (
    <div className="w-full min-w-0 space-y-2.5">
      {!hideLabel && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {grid.name}
          </label>
        </div>
      )}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          {views.map((view) => (
            <TabsTrigger key={view.id} value={view.id}>
              {view.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {views.map((view) => {
          return (
            <TabsContent key={view.id} value={view.id} className="mt-2.5">
              <GridViewContent
                tabId={tabId}
                grid={grid}
                view={view}
                gridLayoutNodes={gridLayoutNodes}
                allLayoutNodes={allLayoutNodes}
                fields={fields}
                allGrids={allGrids}
                allFields={allFields}
                bindings={bindings}
                validations={validations}
                calculations={calculations}
                fieldRulesV2={fieldRulesV2}
                gridData={gridData}
                gridDataRef={gridDataRef}
                gridDataForThisGrid={gridData?.[grid.id] ?? []}
                readOnly={readOnly}
                onUpdate={onUpdate}
                onAddEntry={onAddEntry}
                onDeleteEntries={onDeleteEntries}
                openAddColumnRequest={openAddColumnRequest}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
