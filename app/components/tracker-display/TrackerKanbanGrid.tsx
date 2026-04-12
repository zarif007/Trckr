"use client";

import { useState, useMemo, useCallback, memo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  getBindingForField,
  findOptionRow,
  applyBindings,
  parsePath,
} from "@/lib/resolve-bindings";
import type { FieldRulesMap } from "@/lib/field-rules";
import type { EntryFormSavePayload } from "./grids/data-table/entry-form-dialog";
import { ROW_ACCENT_HEX_CLIENT_KEY } from "@/lib/tracker-grid-rows";
import { useTrackerOptionsContext } from "./tracker-options-context";
import { buildEntryWaysForGrid } from "./entry-way/entry-way-registry";
import {
  KanbanCard,
  useKanbanGroups,
  usePaginatedKanbanColumnSources,
} from "./grids/kanban";
import { GridLayoutEditChrome } from "./grids/shared/GridLayoutEditChrome";
import { TrackerKanbanGridContent } from "./tracker-kanban-grid/TrackerKanbanGridContent";
import type {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
} from "./types";
import type { TrackerContextForOptions } from "@/lib/binding";
import type {
  FieldCalculationRule,
  FieldValidationRule,
} from "@/lib/functions/types";
import { useTrackerDataApi } from "./tracker-data-api-context";
import { useCanEditLayout } from "./edit-mode";
import {
  isGridDataPaginated,
  effectiveKanbanPageSize,
} from "@/lib/grid-data-loading";
import {
  useKanbanPaginatedColumns,
  buildPatchTrackerRowRequestBody,
  persistNewKanbanCardViaRowApi,
} from "@/lib/tracker-grid-rows";

const KANBAN_SORT_SEP = "::";

const EMPTY_ROWS: Array<Record<string, unknown>> = [];
const EMPTY_GROUPS: Array<{ id: string; label: string }> = [];
const EMPTY_FIELDS: TrackerField[] = [];

export interface TrackerKanbanGridProps {
  tabId: string;
  grid: TrackerGrid;
  layoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
  bindings?: TrackerBindings;
  validations?: Record<string, FieldValidationRule[]>;
  calculations?: Record<string, FieldCalculationRule>;
  fieldRulesV2?: FieldRulesMap;
  gridData?: Record<string, Array<Record<string, unknown>>>;
  gridDataRef?: React.RefObject<
    Record<string, Array<Record<string, unknown>>>
  > | null;
  gridDataForThisGrid?: Array<Record<string, unknown>>;
  readOnly?: boolean;
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void;
  onAddEntry?: (newRow: Record<string, unknown>) => void;
  onDeleteEntries?: (rowIndices: number[]) => void;
  onCrossGridUpdate?: (
    gridId: string,
    rowIndex: number,
    fieldId: string,
    value: unknown,
  ) => void;
  trackerContext?: TrackerContextForOptions;
  activeViewId?: string;
  /** Increment from parent to open Add column dialog (view toolbar). */
  openAddColumnRequest?: number;
  /** Hide in-grid Add column when the view toolbar provides it. */
  suppressEmbeddedAddColumn?: boolean;
}

function TrackerKanbanGridInner({
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
  onDeleteEntries,
  onCrossGridUpdate,
  trackerContext: trackerContextProp,
  activeViewId,
  openAddColumnRequest = 0,
  suppressEmbeddedAddColumn = false,
}: TrackerKanbanGridProps) {
  const {
    trackerSchemaId: dataApiTrackerId,
    gridDataBranchName,
    rowBackedPersistLifecycle,
  } = useTrackerDataApi();
  const canEditLayout = useCanEditLayout();
  const thisGridRows = useMemo(
    () => gridDataForThisGrid ?? gridData[grid.id] ?? EMPTY_ROWS,
    [gridDataForThisGrid, gridData, grid.id],
  );
  const gridIsPaginatedCapable =
    isGridDataPaginated(grid) && Boolean(dataApiTrackerId ?? undefined);
  const paginatedKanbanDisplay = gridIsPaginatedCapable && !canEditLayout;
  const mutateKanbanViaRowApi = gridIsPaginatedCapable;

  const addable =
    !readOnly &&
    (grid.config?.isRowAddAble ?? grid.config?.addable ?? true) !== false &&
    (mutateKanbanViaRowApi || onAddEntry != null);
  const editable = !readOnly && grid.config?.isRowEditAble !== false;
  const deleteable =
    !readOnly &&
    (grid.config?.isRowDeletable ?? grid.config?.isRowDeleteAble) !== false &&
    (mutateKanbanViaRowApi || onDeleteEntries != null);
  const canDrag =
    editable && (paginatedKanbanDisplay || onUpdate != null);
  const fullGridData = useMemo(
    () => ({ ...gridData, [grid.id]: thisGridRows }),
    [gridData, grid.id, thisGridRows],
  );
  const gridDataForKanban = useMemo(
    () => ({ ...fullGridData, [grid.id]: thisGridRows }),
    [fullGridData, thisGridRows, grid.id],
  );
  const trackerOptionsFromContext = useTrackerOptionsContext();
  const trackerContext = trackerOptionsFromContext ?? trackerContextProp;
  const foreignGridDataBySchemaId = trackerContext?.foreignGridDataBySchemaId;

  const {
    distinctValuesFromServer: distinctKanbanGroupValues,
    distinctGroupValuesLoading: distinctKanbanGroupValuesLoading,
    columnDiscoveryError,
  } = usePaginatedKanbanColumnSources({
    tabId,
    grid,
    layoutNodes,
    fields,
    bindings,
    gridDataForKanban,
    trackerContext,
    gridIsPaginatedCapable,
    trackerId: dataApiTrackerId,
    branchName: gridDataBranchName ?? "main",
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editCard, setEditCard] = useState<Record<string, unknown> | null>(
    null,
  );
  const [cardFieldVisibility, setCardFieldVisibility] = useState<
    Record<string, boolean>
  >({});

  const kanbanState = useKanbanGroups({
    tabId,
    grid,
    layoutNodes,
    fields,
    bindings,
    validations,
    calculations,
    gridData: gridDataForKanban,
    trackerContext,
    distinctValuesFromServer: distinctKanbanGroupValues,
    distinctGroupValuesLoading: distinctKanbanGroupValuesLoading,
  });

  const existingLayoutFieldIds = useMemo(
    () =>
      layoutNodes
        .filter((n) => n.gridId === grid.id)
        .map((n) => n.fieldId),
    [layoutNodes, grid.id],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const discoveryKanbanGroups = kanbanState?.groups ?? EMPTY_GROUPS;
  const groupByFieldId = kanbanState?.groupByFieldId ?? "";
  const cardFieldsDisplay = kanbanState?.cardFieldsDisplay ?? [];
  const fieldMetadata = kanbanState?.fieldMetadata ?? {};
  const fieldOrder = kanbanState?.fieldOrder ?? [];
  const kanbanFields = kanbanState?.kanbanFields ?? EMPTY_FIELDS;
  const rows = kanbanState?.rows ?? EMPTY_ROWS;

  const kanbanPageSize = effectiveKanbanPageSize(grid);
  const kanbanCols = useKanbanPaginatedColumns({
    trackerId: dataApiTrackerId,
    gridSlug: grid.id,
    branchName: gridDataBranchName,
    groupFieldId: groupByFieldId,
    groupIds: discoveryKanbanGroups.map((g) => g.id),
    pageSize: kanbanPageSize,
    enabled:
      gridIsPaginatedCapable &&
      Boolean(groupByFieldId) &&
      discoveryKanbanGroups.length > 0,
    persistLifecycle: rowBackedPersistLifecycle ?? undefined,
  });

  const groups = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    for (const g of discoveryKanbanGroups) {
      byId.set(g.id, g);
    }
    if (mutateKanbanViaRowApi) {
      const meta = fieldMetadata[groupByFieldId];
      const opts = meta?.options;
      const optionLabelForId = (id: string): string | undefined => {
        const hit = opts?.find((o) =>
          typeof o === "string" ? o === id : o.id === id,
        );
        if (hit == null) return undefined;
        return typeof hit === "string" ? hit : hit.label;
      };
      for (const colKey of Object.keys(kanbanCols.columns)) {
        if (byId.has(colKey)) continue;
        const label =
          colKey === ""
            ? "Uncategorized"
            : (optionLabelForId(colKey) ?? colKey);
        byId.set(colKey, { id: colKey, label });
      }
    }
    const merged = Array.from(byId.values());
    merged.sort((a, b) => {
      const aUnc = a.id === "" ? 1 : 0;
      const bUnc = b.id === "" ? 1 : 0;
      return aUnc - bUnc;
    });
    return merged;
  }, [
    discoveryKanbanGroups,
    mutateKanbanViaRowApi,
    kanbanCols.columns,
    fieldMetadata,
    groupByFieldId,
  ]);

  const persistKanbanNewCard = useCallback(
    (payload: EntryFormSavePayload) => {
      const values = { ...payload.values };
      if (payload.rowAccentHex != null)
        values[ROW_ACCENT_HEX_CLIENT_KEY] = payload.rowAccentHex;
      else delete values[ROW_ACCENT_HEX_CLIENT_KEY];
      const gid = String(
        values[groupByFieldId] ??
          (groups.find((g) => g.id !== "") ?? groups[0])?.id ??
          "",
      );
      persistNewKanbanCardViaRowApi({
        kanban: kanbanCols,
        groupId: gid,
        values,
      });
    },
    [kanbanCols, groupByFieldId, groups],
  );

  const gridDataForCards = useMemo(() => {
    if (!mutateKanbanViaRowApi) return gridDataForKanban;
    const flat = Object.values(kanbanCols.columns).flatMap((c) => c.rows);
    return { ...gridDataForKanban, [grid.id]: flat };
  }, [mutateKanbanViaRowApi, gridDataForKanban, kanbanCols.columns, grid.id]);

  // Default: first 5 card fields visible (like data table column visibility)
  const effectiveCardVisibility = useMemo(() => {
    const next: Record<string, boolean> = { ...cardFieldVisibility };
    cardFieldsDisplay.forEach((f, i) => {
      if (next[f.id] === undefined) next[f.id] = i < 5;
    });
    return next;
  }, [cardFieldsDisplay, cardFieldVisibility]);

  const visibleCardFields = useMemo(
    () =>
      cardFieldsDisplay
        .filter((f) => effectiveCardVisibility[f.id])
        .slice(0, 5),
    [cardFieldsDisplay, effectiveCardVisibility],
  );

  const toggleCardFieldVisibility = useCallback(
    (fieldId: string, visible: boolean) => {
      setCardFieldVisibility((prev) => ({ ...prev, [fieldId]: visible }));
    },
    [],
  );

  const groupedCards = useMemo(() => {
    const map = new Map<
      string,
      Array<Record<string, unknown> & { _originalIdx: number }>
    >();
    if (mutateKanbanViaRowApi) {
      for (const g of groups) {
        const col = kanbanCols.columns[g.id];
        const list = (col?.rows ?? []).map((row) => ({
          ...(row as Record<string, unknown>),
          _originalIdx: 0,
        }));
        map.set(g.id, list);
      }
      return map;
    }
    rows.forEach((row, idx) => {
      const key = String(
        (row as Record<string, unknown>)[groupByFieldId] ?? "",
      ).trim();
      const card = { ...(row as Record<string, unknown>), _originalIdx: idx };
      const list = map.get(key);
      if (list) {
        list.push(card);
      } else {
        map.set(key, [card]);
      }
    });
    return map;
  }, [
    mutateKanbanViaRowApi,
    groups,
    kanbanCols.columns,
    rows,
    groupByFieldId,
  ]);

  const getCardSortId = useCallback(
    (
      card: Record<string, unknown> & { _originalIdx: number },
      groupId: string,
    ) => {
      if (mutateKanbanViaRowApi) {
        return `${String(card._rowId ?? "")}${KANBAN_SORT_SEP}${groupId}`;
      }
      return `${String(card.row_id ?? card.id ?? card._originalIdx)}-${groupId}`;
    },
    [mutateKanbanViaRowApi],
  );

  const validGroupIds = useMemo(
    () => new Set(groups.map((g) => g.id)),
    [groups],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const resolveCardIndex = useCallback(
    (sortId: string): number => {
      if (mutateKanbanViaRowApi) {
        const sepAt = sortId.indexOf(KANBAN_SORT_SEP);
        if (sepAt < 0) return -1;
        const rowKey = sortId.slice(0, sepAt);
        let i = 0;
        for (const g of groups) {
          for (const r of kanbanCols.columns[g.id]?.rows ?? []) {
            if (String((r as Record<string, unknown>)._rowId ?? "") === rowKey) {
              return i;
            }
            i += 1;
          }
        }
        return -1;
      }
      const dashAt = sortId.indexOf("-");
      if (dashAt < 0) return -1;
      const firstPart = sortId.slice(0, dashAt);
      const byRowId = rows.findIndex((r) => {
        const rec = r as Record<string, unknown>;
        return (
          String(rec.row_id ?? "") === firstPart ||
          String(rec.id ?? "") === firstPart
        );
      });
      if (byRowId >= 0) return byRowId;
      if (!/^\d+$/.test(firstPart)) return -1;
      const idx = parseInt(firstPart, 10);
      return !Number.isNaN(idx) && idx >= 0 && idx < rows.length ? idx : -1;
    },
    [mutateKanbanViaRowApi, groups, kanbanCols.columns, rows],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      if (mutateKanbanViaRowApi) {
        const activeStr = String(active.id);
        const sepAt = activeStr.indexOf(KANBAN_SORT_SEP);
        if (sepAt < 0) return;
        const rowId = activeStr.slice(0, sepAt);
        const fromGroup = activeStr.slice(sepAt + KANBAN_SORT_SEP.length);
        const fromCol = kanbanCols.columns[fromGroup];
        const row = fromCol?.rows.find(
          (r) =>
            String((r as Record<string, unknown>)._rowId ?? "") === rowId,
        ) as Record<string, unknown> | undefined;
        if (!row || !groupByFieldId) return;

        const overId = String(over.id);
        let nextGroupId = overId;
        if (overId.includes(KANBAN_SORT_SEP)) {
          const i = overId.indexOf(KANBAN_SORT_SEP);
          nextGroupId = overId.slice(i + KANBAN_SORT_SEP.length);
        } else {
          const dash = overId.indexOf("-");
          if (dash >= 0) nextGroupId = overId.slice(dash + 1);
        }
        const nextGroupIdTrimmed = nextGroupId.trim();
        if (!validGroupIds.has(nextGroupIdTrimmed)) return;

        const currentGroup = String(row[groupByFieldId] ?? "").trim();
        if (currentGroup === nextGroupIdTrimmed) return;

        let merged: Record<string, unknown> = {
          ...row,
          [groupByFieldId]: nextGroupIdTrimmed,
        };

        const groupingField = kanbanFields.find((f) => f.id === groupByFieldId);
        if (
          groupingField &&
          (groupingField.dataType === "options" ||
            groupingField.dataType === "multiselect")
        ) {
          const binding = getBindingForField(
            grid.id,
            groupByFieldId,
            bindings,
            tabId,
          );
          if (binding?.fieldMappings?.length) {
            const selectFieldPath = `${grid.id}.${groupByFieldId}`;
            const flatSans = Object.values(kanbanCols.columns)
              .flatMap((c) => c.rows)
              .filter(
                (r) =>
                  String((r as Record<string, unknown>)._rowId ?? "") !==
                  rowId,
              );
            const tempFull = {
              ...gridData,
              [grid.id]: [...flatSans, merged],
            };
            const optionRow = findOptionRow(
              tempFull,
              binding,
              nextGroupIdTrimmed,
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
                if (targetGridId === grid.id && targetFieldId) {
                  merged = { ...merged, [targetFieldId]: update.value };
                }
              }
            }
          }
        }

        kanbanCols.moveCardLocally(rowId, fromGroup, nextGroupIdTrimmed, merged);
        void kanbanCols
          .patchRowOnServer(rowId, buildPatchTrackerRowRequestBody(merged))
          .catch(() => {
            kanbanCols.refetchAll();
          });
        return;
      }

      if (!onUpdate) return;

      const cardId = active.id as string;
      const overId = String(over.id);
      const cardIdx = resolveCardIndex(cardId);
      if (cardIdx < 0) return;

      const currentCard = rows[cardIdx];
      let nextGroupId = overId;
      const firstDash = overId.indexOf("-");
      if (firstDash >= 0) nextGroupId = overId.slice(firstDash + 1);
      const nextGroupIdTrimmed = nextGroupId.trim();
      if (!validGroupIds.has(nextGroupIdTrimmed)) return;

      const currentGroup = currentCard?.[groupByFieldId];
      if (String(currentGroup ?? "").trim() !== nextGroupIdTrimmed) {
        onUpdate(cardIdx, groupByFieldId, nextGroupIdTrimmed);

        // Apply bindings when group-by field changes (e.g. drag to another column)
        const groupingField = kanbanFields.find((f) => f.id === groupByFieldId);
        if (
          groupingField &&
          (groupingField.dataType === "options" ||
            groupingField.dataType === "multiselect")
        ) {
          const binding = getBindingForField(
            grid.id,
            groupByFieldId,
            bindings,
            tabId,
          );
          if (binding?.fieldMappings?.length) {
            const selectFieldPath = `${grid.id}.${groupByFieldId}`;
            const optionRow = findOptionRow(
              fullGridData,
              binding,
              nextGroupIdTrimmed,
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
                      cardIdx,
                      targetFieldId,
                      update.value,
                    );
                  } else if (targetGridId === grid.id) {
                    onUpdate(cardIdx, targetFieldId, update.value);
                  }
                }
              }
            }
          }
        }
      }
    },
    [
      mutateKanbanViaRowApi,
      kanbanCols,
      groupByFieldId,
      grid.id,
      gridData,
      rows,
      resolveCardIndex,
      onUpdate,
      onCrossGridUpdate,
      validGroupIds,
      kanbanFields,
      bindings,
      tabId,
      fullGridData,
      foreignGridDataBySchemaId,
    ],
  );

  const bindingSourceGridData = mutateKanbanViaRowApi
    ? gridDataForCards
    : fullGridData;

  const getBindingUpdates = useCallback(
    (fieldId: string, value: unknown): Record<string, unknown> => {
      const binding = getBindingForField(grid.id, fieldId, bindings, tabId);
      if (!binding?.fieldMappings?.length) return {};
      const selectFieldPath = `${grid.id}.${fieldId}`;
      const optionRow = findOptionRow(
        bindingSourceGridData,
        binding,
        value,
        selectFieldPath,
        foreignGridDataBySchemaId,
      );
      if (!optionRow) return {};
      const updates = applyBindings(binding, optionRow, selectFieldPath);
      const result: Record<string, unknown> = {};
      for (const u of updates) {
        const { gridId: targetGridId, fieldId: targetFieldId } = parsePath(
          u.targetPath,
        );
        if (targetGridId === grid.id && targetFieldId)
          result[targetFieldId] = u.value;
      }
      return result;
    },
    [
      grid.id,
      bindings,
      tabId,
      bindingSourceGridData,
      foreignGridDataBySchemaId,
    ],
  );

  const handleEditSave = useCallback(
    (payload: EntryFormSavePayload) => {
      if (editRowIndex == null || !onUpdate) return;
      const { values, rowAccentHex } = payload;
      Object.entries(values).forEach(([columnId, value]) => {
        onUpdate(editRowIndex, columnId, value);
      });
      Object.entries(values).forEach(([columnId, value]) => {
        const field = kanbanFields.find((f) => f.id === columnId);
        if (
          field &&
          (field.dataType === "options" || field.dataType === "multiselect")
        ) {
          const binding = getBindingForField(
            grid.id,
            columnId,
            bindings,
            tabId,
          );
          if (binding?.fieldMappings?.length) {
            const selectFieldPath = `${grid.id}.${columnId}`;
            const optionRow = findOptionRow(
              fullGridData,
              binding,
              value,
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
                      editRowIndex,
                      targetFieldId,
                      update.value,
                    );
                  } else if (targetGridId === grid.id) {
                    onUpdate(editRowIndex, targetFieldId, update.value);
                  }
                }
              }
            }
          }
        }
      });
      onUpdate(editRowIndex, ROW_ACCENT_HEX_CLIENT_KEY, rowAccentHex);
      setEditRowIndex(null);
    },
    [
      editRowIndex,
      onUpdate,
      onCrossGridUpdate,
      kanbanFields,
      grid.id,
      bindings,
      tabId,
      fullGridData,
      foreignGridDataBySchemaId,
    ],
  );

  const cardStyles = useMemo(
    () => ({
      cardPadding: "p-4",
      labelFontSize: "text-xs",
      valueFontSize: "text-sm",
      fontWeight: "",
      valueTextColor: "text-foreground",
    }),
    [],
  );

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    const idx = resolveCardIndex(activeId);
    if (idx < 0) return null;
    if (mutateKanbanViaRowApi) {
      let i = 0;
      for (const g of groups) {
        for (const r of kanbanCols.columns[g.id]?.rows ?? []) {
          if (i === idx) return r as Record<string, unknown>;
          i += 1;
        }
      }
      return null;
    }
    return rows[idx];
  }, [
    activeId,
    rows,
    resolveCardIndex,
    mutateKanbanViaRowApi,
    groups,
    kanbanCols.columns,
  ]);

  const handlePaginatedEditSave = useCallback(
    async (payload: EntryFormSavePayload) => {
      if (!editCard) return;
      const rid = editCard._rowId;
      if (typeof rid !== "string") return;
      const merged: Record<string, unknown> = {
        ...editCard,
        ...payload.values,
        [ROW_ACCENT_HEX_CLIENT_KEY]: payload.rowAccentHex,
      };
      try {
        await kanbanCols.patchRowOnServer(
          rid,
          buildPatchTrackerRowRequestBody(merged),
        );
      } catch {
        // refetch below
      } finally {
        kanbanCols.refetchAll();
        setEditCard(null);
      }
    },
    [editCard, kanbanCols],
  );

  const entryWays = useMemo(
    () => buildEntryWaysForGrid({ grid, tabId }),
    [grid, tabId],
  );

  if (!kanbanState) {
    const onThisGrid = layoutNodes.filter((node) => node.gridId === grid.id);
    return (
      <div className="w-full space-y-4">
        {canEditLayout ? (
          <div className="flex justify-end items-center gap-2">
            <GridLayoutEditChrome
              gridId={grid.id}
              viewType="kanban"
              activeViewId={activeViewId}
              canEditLayout={canEditLayout}
              existingLayoutFieldIds={existingLayoutFieldIds}
              allFields={fields}
              openAddColumnRequest={openAddColumnRequest}
              showAddButton={!suppressEmbeddedAddColumn}
            />
          </div>
        ) : null}
        <div className="text-muted-foreground text-sm">
          {onThisGrid.length === 0 ? (
            <>
              No columns yet.
              {canEditLayout ? (
                <>
                  {" "}
                  Use <span className="font-medium text-foreground">Add column</span>{" "}
                  above, then pick a{" "}
                  <span className="font-medium text-foreground">group by</span> column in
                  Configure view (any column on this grid can define board columns).
                </>
              ) : null}
            </>
          ) : (
            <>
              Kanban needs a grouping column: add columns to this grid, then set{" "}
              <span className="font-medium text-foreground">groupBy</span> in Configure
              view (any column on the grid can be used).
            </>
          )}
        </div>
      </div>
    );
  }

  const content = (
    <TrackerKanbanGridContent
      grid={grid}
      addable={addable}
      cardFieldsDisplay={cardFieldsDisplay}
      canEditLayout={canEditLayout}
      activeViewId={activeViewId}
      existingLayoutFieldIds={existingLayoutFieldIds}
      fields={fields}
      openAddColumnRequest={openAddColumnRequest}
      suppressEmbeddedAddColumn={suppressEmbeddedAddColumn}
      effectiveCardVisibility={effectiveCardVisibility}
      toggleCardFieldVisibility={toggleCardFieldVisibility}
      entryWays={entryWays}
      mutateKanbanViaRowApi={mutateKanbanViaRowApi}
      onAddEntry={onAddEntry}
      showAddDialog={showAddDialog}
      setShowAddDialog={setShowAddDialog}
      groupByFieldId={groupByFieldId}
      groups={groups}
      persistKanbanNewCard={persistKanbanNewCard}
      getBindingUpdates={getBindingUpdates}
      fieldRulesV2={fieldRulesV2}
      calculations={calculations}
      gridDataForCards={gridDataForCards}
      fieldMetadata={fieldMetadata}
      fieldOrder={fieldOrder}
      editable={editable}
      editCard={editCard}
      editRowIndex={editRowIndex}
      setEditRowIndex={setEditRowIndex}
      setEditCard={setEditCard}
      rows={rows}
      handlePaginatedEditSave={handlePaginatedEditSave}
      handleEditSave={handleEditSave}
      columnDiscoveryError={columnDiscoveryError}
      distinctKanbanGroupValuesLoading={distinctKanbanGroupValuesLoading}
      groupedCards={groupedCards}
      kanbanCols={kanbanCols}
      canDrag={canDrag}
      getCardSortId={getCardSortId}
      visibleCardFields={visibleCardFields}
      deleteable={deleteable}
      onDeleteEntries={onDeleteEntries}
      paginatedKanbanDisplay={paginatedKanbanDisplay}
      cardStyles={cardStyles}
    />
  );

  if (!canDrag) {
    return content;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {content}
      <DragOverlay
        dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: "0.5" } },
          }),
        }}
      >
        {activeCard ? (
          <KanbanCard
            card={
              activeCard as Record<string, unknown> & { _originalIdx?: number }
            }
            cardFields={visibleCardFields}
            gridId={grid.id}
            gridData={gridDataForCards}
            fieldRules={fieldRulesV2}
            fieldMetadata={fieldMetadata}
            isOverlay
            styles={cardStyles}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export const TrackerKanbanGrid = memo(TrackerKanbanGridInner);
