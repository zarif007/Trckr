"use client";

import { useState, useMemo, useCallback } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { gridContainer, gridHeader } from "@/lib/grid-styles";
import { Button } from "@/components/ui/button";
import { resolveFieldRulesForRow } from "@/lib/field-rules";
import { resolveFieldOptionsV2 } from "@/lib/binding";
import {
  getBindingForField,
  findOptionRow,
  applyBindings,
  parsePath,
} from "@/lib/resolve-bindings";
import {
  EntryFormDialog,
  type EntryFormSavePayload,
} from "../data-table/entry-form-dialog";
import {
  ROW_ACCENT_HEX_CLIENT_KEY,
  parseRowAccentHex,
} from "@/lib/tracker-grid-rows";
import { EntryWayButton } from "../../entry-way/EntryWayButton";
import { buildEntryWaysForGrid } from "../../entry-way/entry-way-registry";
import { useTrackerOptionsContext } from "../../tracker-options-context";
import {
  useLayoutGridEntryForm,
  useTrackerGridRowsFromApi,
  persistNewTrackerGridRow,
  persistEditedTrackerGridRow,
} from "../shared";
import { GridLayoutEditChrome } from "../shared/GridLayoutEditChrome";
import { TimelineGridSkeleton } from "../shared/GridViewDataSkeleton";
import { useCanEditLayout } from "../../edit-mode";
import { resolveTimelineFieldIds } from "./timeline-field-ids";
import {
  normalizeTimelineDateFieldsForRow,
  buildTimelineSwimlaneLanes,
  computePlacedTimelineBars,
  shiftTimelineStoredDateRangeByDays,
  timelineSwimlaneKeyFromRow,
  formatCalendarDayLocal,
  parseCalendarDayLocal,
} from "./timeline-domain";
import { useTimelineGridModel } from "./useTimelineGridModel";
import { TimelineCanvas } from "./TimelineCanvas";
import type { TrackerTimelineGridProps } from "./types";
import type { TimelineView } from "./types";
import type { TimelineDragEndPayload } from "./types";

export type {
  TrackerTimelineGridProps,
  TimelineItem,
  TimelineView,
  TimelineSwimlaneLane,
  PlacedTimelineBar,
} from "./types";

/**
 * Timeline / Gantt-style view for tracker rows with optional swimlanes.
 * @see README.md in this folder for module layout.
 */
export function TrackerTimelineGrid({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings = {},
  validations,
  calculations,
  fieldRulesV2,
  gridData = {},
  gridDataForThisGrid,
  readOnly = false,
  onUpdate,
  onCrossGridUpdate,
  onAddEntry,
  trackerContext: trackerContextProp,
  activeViewId,
  openAddColumnRequest = 0,
  suppressEmbeddedAddColumn = false,
}: TrackerTimelineGridProps) {
  const canEditLayout = useCanEditLayout();
  const {
    rows,
    fullGridData,
    gridIsPaginatedCapable,
    mutateRowsViaRowApi,
    pg,
  } = useTrackerGridRowsFromApi({
    grid,
    gridData,
    gridDataForThisGrid,
  });

  const trackerOptionsFromContext = useTrackerOptionsContext();
  const trackerContextMerged =
    trackerOptionsFromContext ?? trackerContextProp ?? undefined;
  const foreignGridDataBySchemaId =
    trackerContextMerged?.foreignGridDataBySchemaId;
  const { gridFields, fieldMetadata, fieldOrder, getBindingUpdates } =
    useLayoutGridEntryForm({
      tabId,
      grid,
      layoutNodes,
      fields,
      bindings,
      fullGridData,
      validations,
      calculations,
      trackerContext: trackerContextMerged,
    });

  const existingLayoutFieldIds = useMemo(
    () =>
      layoutNodes
        .filter((n) => n.gridId === grid.id)
        .map((n) => n.fieldId),
    [layoutNodes, grid.id],
  );

  const config = grid.config ?? {};
  const { dateFieldId, endDateFieldId, titleFieldId, groupingFieldId } =
    resolveTimelineFieldIds(layoutNodes, config, fields);

  const initialView = (config.viewType as TimelineView) ?? "week";
  const {
    view,
    setView,
    timeRange,
    timelineItems,
    dateDisplay,
    timeAxisMinWidthPx,
    goToPrevious,
    goToNext,
    goToToday,
  } = useTimelineGridModel({
    rows,
    dateFieldId,
    endDateFieldId,
    titleFieldId,
    initialView,
  });

  const swimlaneField = useMemo(
    () =>
      groupingFieldId ? fields.find((f) => f.id === groupingFieldId) : undefined,
    [fields, groupingFieldId],
  );

  const swimlaneFieldUsesResolvedOptions = useMemo(() => {
    if (!swimlaneField) return false;
    const t = swimlaneField.dataType;
    return (
      t === "options" ||
      t === "multiselect" ||
      t === "status" ||
      t === "dynamic_select" ||
      t === "dynamic_multiselect" ||
      t === "field_mappings"
    );
  }, [swimlaneField]);

  const resolvedSwimlaneOptions = useMemo(() => {
    if (!swimlaneField || !swimlaneFieldUsesResolvedOptions) return [];
    return (
      resolveFieldOptionsV2(
        tabId,
        grid.id,
        swimlaneField,
        bindings,
        fullGridData,
        trackerContextMerged ?? undefined,
      ) ?? []
    );
  }, [
    swimlaneField,
    swimlaneFieldUsesResolvedOptions,
    tabId,
    grid.id,
    bindings,
    fullGridData,
    trackerContextMerged,
  ]);

  const swimlanes = useMemo(
    () =>
      buildTimelineSwimlaneLanes({
        groupingFieldId,
        resolvedOptions: swimlaneFieldUsesResolvedOptions
          ? resolvedSwimlaneOptions
          : [],
        timelineItems,
      }),
    [
      groupingFieldId,
      swimlaneFieldUsesResolvedOptions,
      resolvedSwimlaneOptions,
      timelineItems,
    ],
  );

  const placedBars = useMemo(
    () => computePlacedTimelineBars(timelineItems, groupingFieldId, swimlanes),
    [timelineItems, groupingFieldId, swimlanes],
  );

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);

  const addable =
    !readOnly &&
    (mutateRowsViaRowApi || onAddEntry != null) &&
    (grid.config?.isRowAddAble ?? grid.config?.addable ?? true) !== false;
  const editable =
    !readOnly &&
    grid.config?.isRowEditAble !== false &&
    (mutateRowsViaRowApi || onUpdate != null);

  const timelineDragEnabled =
    editable && (mutateRowsViaRowApi || onUpdate != null);

  const handleTimelineBarDragEnd = useCallback(
    async (payload: TimelineDragEndPayload) => {
      if (!timelineDragEnabled) return;
      const { rowIndex, deltaX, trackWidthPx, targetLaneId } = payload;
      const row = rows[rowIndex] as Record<string, unknown> | undefined;
      if (!row) return;

      const values: Record<string, unknown> = {};

      if (
        groupingFieldId &&
        targetLaneId != null &&
        timelineSwimlaneKeyFromRow(row, groupingFieldId) !== targetLaneId
      ) {
        values[groupingFieldId] = targetLaneId;

        const groupingFieldMeta = fields.find((f) => f.id === groupingFieldId);
        if (
          groupingFieldMeta &&
          (groupingFieldMeta.dataType === "options" ||
            groupingFieldMeta.dataType === "multiselect")
        ) {
          const binding = getBindingForField(
            grid.id,
            groupingFieldId,
            bindings,
            tabId,
          );
          if (binding?.fieldMappings?.length) {
            const selectFieldPath = `${grid.id}.${groupingFieldId}`;
            const previewRows = rows.map((r, i) =>
              i === rowIndex
                ? {
                    ...(r as Record<string, unknown>),
                    [groupingFieldId]: targetLaneId,
                  }
                : (r as Record<string, unknown>),
            );
            const tempFull = { ...fullGridData, [grid.id]: previewRows };
            const optionRow = findOptionRow(
              tempFull,
              binding,
              targetLaneId,
              selectFieldPath,
              foreignGridDataBySchemaId,
            );
            if (optionRow) {
              const updates = applyBindings(
                binding,
                optionRow,
                selectFieldPath,
              );
              for (const update of updates) {
                const { gridId: targetGridId, fieldId: targetFieldId } =
                  parsePath(update.targetPath);
                if (targetGridId && targetFieldId) {
                  if (onCrossGridUpdate) {
                    onCrossGridUpdate(
                      targetGridId,
                      rowIndex,
                      targetFieldId,
                      update.value,
                    );
                  } else if (targetGridId === grid.id) {
                    values[targetFieldId] = update.value;
                  }
                }
              }
            }
          }
        }
      }

      let deltaDays = 0;
      if (
        dateFieldId &&
        endDateFieldId &&
        trackWidthPx > 0 &&
        Math.abs(deltaX) >= 4
      ) {
        const totalMs = timeRange.end.getTime() - timeRange.start.getTime();
        if (totalMs > 0) {
          deltaDays = Math.round(
            (deltaX / trackWidthPx) * (totalMs / 86_400_000),
          );
        }
      }
      if (deltaDays !== 0 && dateFieldId && endDateFieldId) {
        const shifted = shiftTimelineStoredDateRangeByDays(
          row,
          dateFieldId,
          endDateFieldId,
          deltaDays,
        );
        if (shifted) Object.assign(values, shifted);
      }

      if (Object.keys(values).length === 0) return;

      const mergedPreview = { ...row, ...values };
      const normalized =
        dateFieldId && endDateFieldId
          ? normalizeTimelineDateFieldsForRow(
              mergedPreview,
              dateFieldId,
              endDateFieldId,
            )
          : mergedPreview;

      const deltaForPersist: Record<string, unknown> = {};
      for (const key of Object.keys(normalized)) {
        if (normalized[key] !== row[key]) {
          deltaForPersist[key] = normalized[key];
        }
      }
      if (Object.keys(deltaForPersist).length === 0) return;

      await persistEditedTrackerGridRow({
        mutateViaRowApi: mutateRowsViaRowApi,
        pg,
        rowIndex,
        rows,
        values: deltaForPersist,
        onSnapshotUpdate: onUpdate,
      });
    },
    [
      timelineDragEnabled,
      rows,
      groupingFieldId,
      fields,
      bindings,
      tabId,
      grid.id,
      fullGridData,
      foreignGridDataBySchemaId,
      onCrossGridUpdate,
      dateFieldId,
      endDateFieldId,
      timeRange.end,
      timeRange.start,
      mutateRowsViaRowApi,
      pg,
      onUpdate,
    ],
  );

  const entryWays = useMemo(
    () => buildEntryWaysForGrid({ grid, tabId }),
    [grid, tabId],
  );

  const openNewEntryDialog = useCallback(() => {
    const today = parseCalendarDayLocal(new Date());
    setSelectedDate(today ?? new Date());
    setShowAddDialog(true);
  }, []);

  const formReadyForAdd =
    gridFields.length > 0 &&
    Boolean(dateFieldId) &&
    Boolean(endDateFieldId) &&
    gridFields.some((f) => f.id === dateFieldId) &&
    gridFields.some((f) => f.id === endDateFieldId);

  const showTimelineGroupingWarning =
    canEditLayout &&
    !groupingFieldId &&
    gridFields.length > 0 &&
    Boolean(dateFieldId) &&
    Boolean(endDateFieldId);

  const showInitialRowsLoading =
    gridIsPaginatedCapable && pg.loading && rows.length === 0;

  const addFormInitialValues = useMemo((): Record<string, unknown> => {
    const v: Record<string, unknown> = {};
    if (dateFieldId && selectedDate) {
      const localDay = parseCalendarDayLocal(selectedDate);
      if (!localDay) return v;
      const day = formatCalendarDayLocal(localDay);
      v[dateFieldId] = day;
      if (endDateFieldId) v[endDateFieldId] = day;
    }
    return v;
  }, [dateFieldId, endDateFieldId, selectedDate]);

  const handleAddSave = useCallback(
    (payload: EntryFormSavePayload) => {
      const normalized =
        dateFieldId && endDateFieldId
          ? normalizeTimelineDateFieldsForRow(
              payload.values,
              dateFieldId,
              endDateFieldId,
            )
          : payload.values;
      const values = { ...normalized };
      if (payload.rowAccentHex != null)
        values[ROW_ACCENT_HEX_CLIENT_KEY] = payload.rowAccentHex;
      else delete values[ROW_ACCENT_HEX_CLIENT_KEY];
      persistNewTrackerGridRow({
        mutateViaRowApi: mutateRowsViaRowApi,
        pg,
        values,
        onSnapshotAdd: onAddEntry,
      });
      setShowAddDialog(false);
      setSelectedDate(null);
    },
    [mutateRowsViaRowApi, pg, onAddEntry, dateFieldId, endDateFieldId],
  );

  const handleAddSaveAnother = useCallback(
    (payload: EntryFormSavePayload) => {
      const normalized =
        dateFieldId && endDateFieldId
          ? normalizeTimelineDateFieldsForRow(
              payload.values,
              dateFieldId,
              endDateFieldId,
            )
          : payload.values;
      const values = { ...normalized };
      if (payload.rowAccentHex != null)
        values[ROW_ACCENT_HEX_CLIENT_KEY] = payload.rowAccentHex;
      else delete values[ROW_ACCENT_HEX_CLIENT_KEY];
      persistNewTrackerGridRow({
        mutateViaRowApi: mutateRowsViaRowApi,
        pg,
        values,
        onSnapshotAdd: onAddEntry,
      });
    },
    [mutateRowsViaRowApi, pg, onAddEntry, dateFieldId, endDateFieldId],
  );

  const handleEditSave = useCallback(
    async (payload: EntryFormSavePayload) => {
      if (editRowIndex == null) return;
      const normalized =
        dateFieldId && endDateFieldId
          ? normalizeTimelineDateFieldsForRow(
              payload.values,
              dateFieldId,
              endDateFieldId,
            )
          : payload.values;
      const values = {
        ...normalized,
        [ROW_ACCENT_HEX_CLIENT_KEY]: payload.rowAccentHex,
      };
      await persistEditedTrackerGridRow({
        mutateViaRowApi: mutateRowsViaRowApi,
        pg,
        rowIndex: editRowIndex,
        rows,
        values,
        onSnapshotUpdate: onUpdate,
      });
      setEditRowIndex(null);
    },
    [
      editRowIndex,
      mutateRowsViaRowApi,
      pg,
      rows,
      onUpdate,
      dateFieldId,
      endDateFieldId,
    ],
  );

  const openEdit = useCallback(
    (rowIndex: number) => {
      if (!editable) return;
      setEditRowIndex(rowIndex);
    },
    [editable],
  );

  return (
    <div
      className={cn(
        gridContainer,
        "flex flex-col w-full min-w-0 h-auto min-h-0 overflow-hidden",
      )}
    >
      {gridIsPaginatedCapable && pg.error ? (
        <div
          className={cn(
            "mb-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive shrink-0",
            theme.radius.md,
          )}
        >
          {pg.error}
        </div>
      ) : null}
      <div className={cn(gridHeader, "flex-wrap gap-2")}>
        <div className="flex items-center gap-1 md:gap-2">
          <div className="flex items-center gap-0.5 md:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 md:h-7 md:w-7"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 md:h-7 md:w-7"
              onClick={goToNext}
            >
              <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>
          <h3 className="text-xs md:text-sm font-semibold min-w-[140px] md:min-w-[200px]">
            {dateDisplay}
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-6 md:h-7 text-[10px] md:text-xs px-2 md:px-3"
            onClick={goToToday}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-end">
          <GridLayoutEditChrome
            gridId={grid.id}
            viewType="timeline"
            activeViewId={activeViewId}
            canEditLayout={canEditLayout}
            existingLayoutFieldIds={existingLayoutFieldIds}
            allFields={fields}
            openAddColumnRequest={openAddColumnRequest}
            showAddButton={!suppressEmbeddedAddColumn}
          />
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-sm border p-0.5 bg-muted/30",
              theme.uiChrome.border,
            )}
          >
            {(["day", "week", "month", "quarter"] as TimelineView[]).map(
              (v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "px-1.5 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium rounded-sm capitalize transition-colors border border-transparent",
                    view === v
                      ? cn(
                          "bg-background text-foreground",
                          theme.uiChrome.tabActive,
                        )
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <span className="hidden md:inline">{v}</span>
                  <span className="md:hidden">{v.slice(0, 1)}</span>
                </button>
              ),
            )}
          </div>

          {addable && (
            <EntryWayButton
              onNewEntryClick={openNewEntryDialog}
              entryWays={entryWays}
              onSelectEntryWay={() => {}}
              disabled={
                (!mutateRowsViaRowApi && !onAddEntry) || !formReadyForAdd
              }
            />
          )}
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2">
        {showTimelineGroupingWarning ? (
          <div
            className={cn(
              "flex shrink-0 gap-3 rounded-sm border px-3 py-3 sm:px-4",
              theme.radius.md,
              "border-warning/25 bg-warning/5",
            )}
            role="status"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium leading-snug text-foreground">
                All rows are in one lane until you set a group column
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                While editing layout, open{" "}
                <span className="font-semibold text-foreground">Configure</span>{" "}
                for this timeline view, then choose{" "}
                <span className="font-medium text-foreground">Group by column</span>{" "}
                under Grouping (status, options, text, or similar fields).
              </p>
            </div>
          </div>
        ) : null}
        {gridFields.length === 0 && canEditLayout ? (
          <div
            className={cn(
              "m-4 rounded-sm border px-4 py-6 text-sm text-muted-foreground",
              theme.uiChrome.border,
              theme.radius.md,
            )}
          >
            No columns yet. Use{" "}
            <span className="font-medium text-foreground">Add column</span>{" "}
            above, then add two <span className="font-medium text-foreground">date</span>{" "}
            fields (start and end) for the timeline range.
          </div>
        ) : null}
        <div className="min-w-0 w-full overflow-x-auto">
          {showInitialRowsLoading && gridFields.length > 0 ? (
            <TimelineGridSkeleton />
          ) : (
            <TimelineCanvas
              placedBars={placedBars}
              swimlanes={swimlanes}
              timeRange={timeRange}
              view={view}
              groupingFieldId={groupingFieldId}
              minContentWidthPx={timeAxisMinWidthPx}
              mutateViaRowApi={mutateRowsViaRowApi}
              timelineDragEnabled={timelineDragEnabled}
              timelineClickToAddEnabled={addable && formReadyForAdd}
              onTimelineClick={(date) => {
                const localDay = parseCalendarDayLocal(date) ?? date;
                setSelectedDate(localDay);
                setShowAddDialog(true);
              }}
              onItemClick={openEdit}
              onBarDragEnd={handleTimelineBarDragEnd}
            />
          )}
        </div>
      </div>

      {addable && formReadyForAdd && (
        <EntryFormDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) setSelectedDate(null);
          }}
          title="Add New Entry"
          submitLabel="Add Entry"
          fieldMetadata={fieldMetadata}
          fieldOrder={fieldOrder}
          initialValues={addFormInitialValues}
          onSave={handleAddSave}
          onSaveAnother={handleAddSaveAnother}
          getBindingUpdates={getBindingUpdates}
          getFieldOverrides={(values, fieldId) => {
            const { overrides } = resolveFieldRulesForRow(
              fieldRulesV2,
              grid.id,
              values,
              0,
            );
            return overrides[fieldId] as Record<string, unknown> | undefined;
          }}
          gridId={grid.id}
          calculations={calculations}
          gridData={fullGridData}
        />
      )}

      {editable && (
        <EntryFormDialog
          open={editRowIndex !== null}
          onOpenChange={(open) => {
            if (!open) setEditRowIndex(null);
          }}
          title="Row Details"
          submitLabel="Update Entry"
          mode="edit"
          fieldMetadata={fieldMetadata}
          fieldOrder={fieldOrder}
          initialValues={
            editRowIndex != null ? { ...(rows[editRowIndex] ?? {}) } : {}
          }
          initialRowAccentHex={
            editRowIndex != null
              ? parseRowAccentHex(
                  (rows[editRowIndex] as Record<string, unknown> | undefined)?.[
                    ROW_ACCENT_HEX_CLIENT_KEY
                  ],
                )
              : null
          }
          onSave={handleEditSave}
          getBindingUpdates={getBindingUpdates}
          getFieldOverrides={(values, fieldId) => {
            const { overrides } = resolveFieldRulesForRow(
              fieldRulesV2,
              grid.id,
              values,
              editRowIndex ?? 0,
            );
            return overrides[fieldId] as Record<string, unknown> | undefined;
          }}
          gridId={grid.id}
          calculations={calculations}
          gridData={fullGridData}
        />
      )}
    </div>
  );
}
