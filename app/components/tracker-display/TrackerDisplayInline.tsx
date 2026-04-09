"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { TrackerDisplayProps } from "./types";
import type { TrackerTab } from "./types";
import { TrackerTabContent } from "./sections";
import { InlineEditableName } from "./layout";
import { TrackerOptionsProvider } from "./tracker-options-context";
import { EditModeProvider } from "./edit-mode";
import { SHARED_TAB_ID } from "@/lib/field-rules-options";
import { collectOptionsSourceSchemaIds } from "@/lib/resolve-bindings";
import { useTrackerTabs } from "./state/useTrackerTabs";
import { useGridDataEngine } from "./state/useGridDataEngine";
import { useSchemaTabActions } from "./state/useSchemaTabActions";
import { useForeignBindingSources } from "./foreign-binding-sources";
import { TrackerDataApiProvider } from "./tracker-data-api-context";
// Bindings grid (Shared tab) intentionally unused; bindings are configured per field settings now.

// Stable component so tab row is not remounted on parent re-render (avoids animate-in re-trigger on add/edit).
function SortableTabRow({
  tab,
  editMode,
  onSchemaChange,
  onRenameTab,
  onRemoveTab,
}: {
  tab: TrackerTab;
  editMode?: boolean;
  onSchemaChange?: TrackerDisplayProps["onSchemaChange"];
  onRenameTab: (tabId: string, name: string) => void;
  /** When undefined, remove button is hidden (e.g. for non-removable Shared tab). */
  onRemoveTab: ((tabId: string) => void) | undefined;
}) {
  const id = `tab-${tab.id}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-0.5 ${isDragging ? "opacity-50" : ""}`}
    >
      {editMode && onSchemaChange && (
        <span
          className="flex min-w-0 max-w-0 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-sm text-muted-foreground/50 overflow-hidden transition-[max-width,opacity] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] opacity-0 max-w-0 group-hover:max-w-6 group-hover:opacity-100 hover:bg-muted/80"
          aria-hidden
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0" />
        </span>
      )}
      <TabsTrigger
        value={tab.id}
        className="min-w-0 max-w-[11rem] truncate text-xs font-semibold sm:max-w-[15rem]"
      >
        {editMode && onSchemaChange ? (
          <span
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 truncate"
          >
            <InlineEditableName
              value={tab.name}
              onChange={(name) => onRenameTab(tab.id, name)}
              className="text-xs font-semibold truncate"
            />
          </span>
        ) : (
          tab.name
        )}
      </TabsTrigger>
      {editMode && onSchemaChange && onRemoveTab && (
        <span className="flex min-w-0 max-w-0 shrink-0 overflow-hidden transition-[max-width,opacity] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:max-w-6 group-hover:opacity-100 opacity-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 rounded-sm text-muted-foreground/50 hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveTab(tab.id);
            }}
            aria-label={`Remove tab ${tab.name}`}
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
          </Button>
        </span>
      )}
    </div>
  );
}

export function TrackerDisplayInline({
  tabs,
  sections,
  grids,
  fields,
  formActions,
  layoutNodes = [],
  bindings = {},
  validations,
  calculations,
  dynamicOptions,
  initialGridData,
  getDataRef,
  fieldRulesV2,
  onGridDataChange,
  readOnly,
  editMode,
  onSchemaChange,
  undo,
  canUndo,
  trackerSchemaId,
  projectId,
  onForeignBindingNavUiChange,
  gridDataBranchName = "main",
}: TrackerDisplayProps) {
  const effectiveSections = sections ?? [];
  const effectiveGrids = grids ?? [];
  const effectiveFields = fields ?? [];
  const effectiveLayoutNodes = layoutNodes ?? [];
  const { normalizedTabs, activeTabId, setActiveTabId, handleTabChange } =
    useTrackerTabs(tabs);
  const {
    gridData,
    gridDataRef,
    editVersion,
    handleUpdate,
    handleAddEntry,
    handleDeleteEntries,
  } = useGridDataEngine({
    bindings,
    initialGridData,
    calculations,
    gridIds: effectiveGrids.map((grid) => grid.id),
  });
  const effectiveBindings = useMemo(() => bindings ?? {}, [bindings]);
  const bindingSourceIds = useMemo(
    () =>
      collectOptionsSourceSchemaIds(effectiveBindings, trackerSchemaId ?? null),
    [effectiveBindings, trackerSchemaId],
  );
  const {
    foreignGridDataBySchemaId,
    foreignSchemaBySchemaId,
    onAddEntryToForeignGrid,
    foreignSourcesLoading,
    foreignSourcesSaving,
    foreignPersistError,
    dismissForeignPersistError,
  } = useForeignBindingSources(bindingSourceIds);

  const onForeignBindingNavRef = useRef(onForeignBindingNavUiChange);
  onForeignBindingNavRef.current = onForeignBindingNavUiChange;

  useEffect(() => {
    const notify = onForeignBindingNavRef.current;
    if (!notify) return;
    if (bindingSourceIds.length === 0) {
      notify(null);
      return;
    }
    notify({
      loading: foreignSourcesLoading,
      saving: foreignSourcesSaving,
      error: foreignPersistError,
      dismissError: dismissForeignPersistError,
    });
  }, [
    bindingSourceIds.length,
    foreignSourcesLoading,
    foreignSourcesSaving,
    foreignPersistError,
    dismissForeignPersistError,
  ]);

  useEffect(() => {
    return () => {
      onForeignBindingNavRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    if (!getDataRef) return;
    getDataRef.current = () => gridData;
  }, [gridData, getDataRef]);

  const lastNotifiedVersionRef = useRef(0);
  useEffect(() => {
    if (!onGridDataChange) return;
    if (editVersion === 0) return;
    if (editVersion <= lastNotifiedVersionRef.current) return;
    lastNotifiedVersionRef.current = editVersion;
    onGridDataChange(gridData);
  }, [editVersion, gridData, onGridDataChange]);

  const editModeSchema = useMemo(
    () =>
      editMode
        ? {
            tabs,
            sections,
            grids,
            fields,
            formActions,
            layoutNodes,
            bindings,
            validations,
            calculations,
            fieldRulesV2,
            dynamicOptions,
          }
        : undefined,
    [
      editMode,
      tabs,
      sections,
      grids,
      fields,
      formActions,
      layoutNodes,
      bindings,
      validations,
      calculations,
      fieldRulesV2,
      dynamicOptions,
    ],
  );
  const { handleAddTab, handleRemoveTab, handleRenameTab, handleTabDragEnd } =
    useSchemaTabActions({
      tabs,
      sections,
      grids,
      fields,
      layoutNodes,
      bindings,
      validations,
      calculations,
      dynamicOptions,
      onSchemaChange,
      normalizedTabs,
      activeTabId,
      setActiveTabId,
    });

  const tabSortableIds = useMemo(
    () => normalizedTabs.map((t) => `tab-${t.id}`),
    [normalizedTabs],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  if (!normalizedTabs.length && !editMode) return null;

  const tabListContent =
    normalizedTabs.length > 0 || editMode ? (
      <TabsList>
        {editMode && onSchemaChange ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTabDragEnd}
          >
            <SortableContext
              items={tabSortableIds}
              strategy={horizontalListSortingStrategy}
            >
              {normalizedTabs.map((tab) => (
                <SortableTabRow
                  key={tab.id}
                  tab={tab}
                  editMode={editMode}
                  onSchemaChange={onSchemaChange}
                  onRenameTab={handleRenameTab}
                  onRemoveTab={
                    tab.id === SHARED_TAB_ID ? undefined : handleRemoveTab
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          normalizedTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="min-w-0 max-w-[11rem] truncate text-xs font-semibold sm:max-w-[15rem]"
            >
              {tab.name}
            </TabsTrigger>
          ))
        )}
      </TabsList>
    ) : null;

  const content = (
    <div className="w-full min-w-0 space-y-4 px-2 py-3 md:px-3 md:py-4 rounded-sm bg-card border border-border/20">
      <Tabs
        value={activeTabId}
        onValueChange={handleTabChange}
        className="w-full min-w-0 gap-2"
      >
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
          {tabListContent}
          {editMode && onSchemaChange && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddTab}
              aria-label="Add tab"
              className="shrink-0 h-8 w-8 border border-dashed border-border/30 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/50"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        {normalizedTabs.map((tab) => (
          <TrackerTabContent
            key={tab.id}
            tab={tab}
            sections={effectiveSections}
            grids={effectiveGrids}
            fields={effectiveFields}
            layoutNodes={effectiveLayoutNodes}
            bindings={effectiveBindings}
            validations={validations}
            calculations={calculations}
            fieldRulesV2={fieldRulesV2}
            gridData={gridData}
            gridDataRef={gridDataRef}
            readOnly={readOnly}
            onUpdate={handleUpdate}
            onAddEntry={handleAddEntry}
            onDeleteEntries={handleDeleteEntries}
          />
        ))}
      </Tabs>
    </div>
  );

  return (
    <TrackerDataApiProvider
      trackerSchemaId={trackerSchemaId}
      gridDataBranchName={gridDataBranchName}
    >
      <TrackerOptionsProvider
        grids={effectiveGrids}
        fields={effectiveFields}
        layoutNodes={effectiveLayoutNodes}
        sections={effectiveSections}
        dynamicOptions={dynamicOptions}
        gridData={gridData}
        trackerSchemaId={trackerSchemaId ?? undefined}
        foreignGridDataBySchemaId={foreignGridDataBySchemaId}
        foreignSchemaBySchemaId={foreignSchemaBySchemaId}
        onAddEntryToForeignGrid={onAddEntryToForeignGrid}
      >
        <EditModeProvider
          editMode={!!editMode}
          schema={editModeSchema}
          onSchemaChange={onSchemaChange}
          undo={undo}
          canUndo={canUndo}
          trackerSchemaId={trackerSchemaId}
          projectId={projectId ?? undefined}
        >
          {content}
        </EditModeProvider>
      </TrackerOptionsProvider>
    </TrackerDataApiProvider>
  );
}
