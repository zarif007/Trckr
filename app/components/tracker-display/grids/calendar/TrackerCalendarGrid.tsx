"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { gridContainer, gridHeader } from "@/lib/grid-styles";
import { Button } from "@/components/ui/button";
import { resolveFieldRulesForRow } from "@/lib/field-rules";
import { EntryFormDialog } from "../data-table/entry-form-dialog";
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
import { useCanEditLayout } from "../../edit-mode";
import { resolveCalendarFieldIds } from "./calendar-field-ids";
import { useCalendarGridModel } from "./useCalendarGridModel";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import type { TrackerCalendarGridProps } from "./types";
import type { CalendarView } from "./types";

export type { TrackerCalendarGridProps, CalendarCellEvent, CalendarView } from "./types";

/**
 * Calendar view for a tracker grid: month / week / day layouts over the same row model as table/kanban.
 * @see README.md in this folder for module layout.
 */
export function TrackerCalendarGrid({
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
  onAddEntry,
  trackerContext: trackerContextProp,
  activeViewId,
  openAddColumnRequest = 0,
  suppressEmbeddedAddColumn = false,
}: TrackerCalendarGridProps) {
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
  const { dateFieldId, titleFieldId } = resolveCalendarFieldIds(
    layoutNodes,
    config,
  );

  const initialView = (config.viewType as CalendarView) ?? "month";
  const {
    view,
    setView,
    currentDate,
    calendarDays,
    weekDays,
    getEventsForDate,
    isToday,
    goToPrevious,
    goToNext,
    goToToday,
    monthYearDisplay,
    weekOfLabel,
    dayViewTitle,
  } = useCalendarGridModel({
    rows,
    dateFieldId,
    initialView,
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);

  const formReadyForAdd =
    gridFields.length > 0 &&
    Boolean(dateFieldId) &&
    gridFields.some((f) => f.id === dateFieldId);

  const addable =
    !readOnly &&
    (mutateRowsViaRowApi || onAddEntry != null) &&
    (grid.config?.isRowAddAble ?? grid.config?.addable ?? true) !== false;
  const editable =
    !readOnly &&
    grid.config?.isRowEditAble !== false &&
    (mutateRowsViaRowApi || onUpdate != null);

  const entryWays = useMemo(
    () => buildEntryWaysForGrid({ grid, tabId }),
    [grid, tabId],
  );

  const openNewEntryDialog = useCallback(() => {
    setSelectedDate(new Date());
    setShowAddDialog(true);
  }, []);

  const handleDayClick = useCallback(
    (date: Date) => {
      if (addable && dateFieldId && gridFields.length > 0) {
        setSelectedDate(date);
        setShowAddDialog(true);
      }
    },
    [addable, dateFieldId, gridFields.length],
  );

  const addFormInitialValues = useMemo((): Record<string, unknown> => {
    const v: Record<string, unknown> = {};
    if (dateFieldId && selectedDate) {
      v[dateFieldId] = selectedDate.toISOString().split("T")[0];
    }
    return v;
  }, [dateFieldId, selectedDate]);

  const handleAddSave = useCallback(
    (values: Record<string, unknown>) => {
      persistNewTrackerGridRow({
        mutateViaRowApi: mutateRowsViaRowApi,
        pg,
        values,
        onSnapshotAdd: onAddEntry,
      });
      setShowAddDialog(false);
      setSelectedDate(null);
    },
    [mutateRowsViaRowApi, pg, onAddEntry],
  );

  const handleAddSaveAnother = useCallback(
    (values: Record<string, unknown>) => {
      persistNewTrackerGridRow({
        mutateViaRowApi: mutateRowsViaRowApi,
        pg,
        values,
        onSnapshotAdd: onAddEntry,
      });
    },
    [mutateRowsViaRowApi, pg, onAddEntry],
  );

  const handleEditSave = useCallback(
    async (values: Record<string, unknown>) => {
      if (editRowIndex == null) return;
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
    [editRowIndex, mutateRowsViaRowApi, pg, rows, onUpdate],
  );

  const openEdit = useCallback(
    (rowIndex: number) => {
      if (!editable) return;
      setEditRowIndex(rowIndex);
    },
    [editable],
  );

  return (
    <div className={cn(gridContainer, "flex flex-col h-[500px] md:h-[600px]")}>
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
          <h3 className="text-xs md:text-sm font-semibold min-w-[100px] md:min-w-[140px]">
            {view === "week" && weekOfLabel}
            {view === "day" && dayViewTitle}
            {view === "month" && monthYearDisplay}
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
            viewType="calendar"
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
            {(["month", "week", "day"] as CalendarView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "px-1.5 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium rounded-sm capitalize transition-colors border border-transparent",
                  view === v
                    ? cn("bg-background text-foreground", theme.uiChrome.tabActive)
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <span className="hidden md:inline">{v}</span>
                <span className="md:hidden">{v.slice(0, 1)}</span>
              </button>
            ))}
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

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
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
            above, then add at least one{" "}
            <span className="font-medium text-foreground">date</span> field (or
            set the calendar date field in view settings).
          </div>
        ) : null}
        <div className="min-w-[720px] h-full">
          {view === "month" && (
            <MonthView
              days={calendarDays}
              getEventsForDate={getEventsForDate}
              onDayClick={handleDayClick}
              onEventClick={openEdit}
              isToday={isToday}
              titleFieldId={titleFieldId}
            />
          )}

          {view === "week" && (
            <WeekView
              weekDays={weekDays}
              getEventsForDate={getEventsForDate}
              onDayClick={handleDayClick}
              onEventClick={openEdit}
              isToday={isToday}
              titleFieldId={titleFieldId}
            />
          )}

          {view === "day" && (
            <DayView
              date={currentDate}
              getEventsForDate={getEventsForDate}
              onTimeClick={handleDayClick}
              onEventClick={openEdit}
              isToday={isToday}
              titleFieldId={titleFieldId}
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
