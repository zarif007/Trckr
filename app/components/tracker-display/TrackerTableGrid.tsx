import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./grids/data-table";
import type { FieldMetadata } from "./grids/data-table/utils";
import type {
  FieldCalculationRule,
  FieldValidationRule,
} from "@/lib/functions/types";
import type { TrackerContextForOptions } from "@/lib/binding";
import {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
} from "./types";
import { TrackerCell } from "./TrackerCell";
import {
  resolveFieldOptionsV2,
  resolveFieldOptionsV2Async,
} from "@/lib/binding";
import {
  getBindingForField,
  findOptionRow,
  applyBindings,
  parsePath,
  getValueFieldIdFromBinding,
  resolveBindingSelectSourceDisplay,
} from "@/lib/resolve-bindings";
import type { OptionsGridFieldDef } from "./grids/data-table/utils";
import { resolveFieldRulesForRow } from "@/lib/field-rules";
import type { FieldRulesMap, FieldRuleOverride } from "@/lib/field-rules";
import { useTrackerOptionsContext } from "./tracker-options-context";
import { buildEntryWaysForGrid } from "./entry-way/entry-way-registry";
import { useMemo, useCallback, useState, useEffect, useRef, memo } from "react";
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
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  useEditMode,
  useLayoutActions,
  AddColumnOrFieldDialog,
  SortableColumnHeaderEdit,
  fieldSortableId,
  parseFieldId,
  FieldSettingsDialog,
} from "./edit-mode";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTrackerDataApi } from "./tracker-data-api-context";
import {
  isGridDataPaginated,
  effectivePaginatedPageSize,
} from "@/lib/grid-data-loading";
import {
  usePaginatedGridData,
  rowPayloadForPatch,
  persistNewTrackerGridRow,
} from "@/lib/tracker-grid-rows";

const EMPTY_ROWS: Array<Record<string, unknown>> = [];

interface TrackerTableGridProps {
  tabId: string;
  grid: TrackerGrid;
  layoutNodes: TrackerLayoutNode[];
  /** All layout nodes (all grids). Used to resolve options grid fields for Add Option. */
  allLayoutNodes?: TrackerLayoutNode[];
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
  /** Add a row to any grid (e.g. options grid). Used for "Add option" in select/multiselect. */
  onAddEntryToGrid?: (gridId: string, newRow: Record<string, unknown>) => void;
  onDeleteEntries?: (rowIndices: number[]) => void;
  onCrossGridUpdate?: (
    gridId: string,
    rowIndex: number,
    fieldId: string,
    value: unknown,
  ) => void;
  /** For dynamic_select/dynamic_multiselect option resolution (e.g. all_field_paths). */
  trackerContext?: TrackerContextForOptions;
  /** Increment from parent to open Add column dialog (view toolbar). */
  openAddColumnRequest?: number;
  /** Hide in-grid Add column when the view toolbar provides it. */
  suppressEmbeddedAddColumn?: boolean;
}

function TrackerTableGridInner({
  tabId,
  grid,
  layoutNodes,
  allLayoutNodes,
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
  onAddEntryToGrid,
  onDeleteEntries,
  onCrossGridUpdate,
  trackerContext: trackerContextProp,
  openAddColumnRequest = 0,
  suppressEmbeddedAddColumn = false,
}: TrackerTableGridProps) {
  const thisGridRows = useMemo(
    () => gridDataForThisGrid ?? gridData[grid.id] ?? EMPTY_ROWS,
    [gridDataForThisGrid, gridData, grid.id],
  );
  const trackerOptionsFromContext = useTrackerOptionsContext();
  const trackerContext = trackerOptionsFromContext ?? trackerContextProp;
  const foreignGridDataBySchemaId = trackerContext?.foreignGridDataBySchemaId;
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [settingsFieldId, setSettingsFieldId] = useState<string | null>(null);
  const [asyncDynamicFieldOptions, setAsyncDynamicFieldOptions] = useState<
    Record<string, ReturnType<typeof resolveFieldOptionsV2> | undefined>
  >({});
  const {
    editMode,
    schema,
    onSchemaChange,
    trackerSchemaId: editTrackerSchemaId,
  } = useEditMode();
  const {
    trackerSchemaId: dataApiTrackerId,
    gridDataBranchName,
    rowBackedPersistLifecycle,
  } = useTrackerDataApi();
  const canEditLayout = editMode && !!schema && !!onSchemaChange;
  const lastOpenAddColumnRequestRef = useRef(0);
  useEffect(() => {
    if (openAddColumnRequest <= lastOpenAddColumnRequestRef.current) return;
    lastOpenAddColumnRequestRef.current = openAddColumnRequest;
    if (canEditLayout) {
      setAddColumnOpen(true);
    }
  }, [openAddColumnRequest, canEditLayout]);
  const gridIsPaginatedCapable =
    isGridDataPaginated(grid) && Boolean(dataApiTrackerId ?? undefined);
  /** Server-driven table UI (pagination, totals); off in layout edit so TanStack paginates locally. */
  const paginatedDisplay = gridIsPaginatedCapable && !canEditLayout;
  /** PATCH/create/delete via row API whenever the visible rows come from that fetch (omitted snapshot). */
  const mutateRowsViaRowApi =
    gridIsPaginatedCapable &&
    (paginatedDisplay || (canEditLayout && thisGridRows.length === 0));

  const pSize = effectivePaginatedPageSize(grid);
  const pg = usePaginatedGridData({
    trackerId: dataApiTrackerId,
    gridSlug: grid.id,
    branchName: gridDataBranchName,
    initialPageSize: pSize,
    enabled: gridIsPaginatedCapable,
    persistLifecycle: rowBackedPersistLifecycle ?? undefined,
  });

  const rows = useMemo((): Array<Record<string, unknown>> => {
    if (!isGridDataPaginated(grid)) return thisGridRows;
    if (paginatedDisplay) return pg.rows as Array<Record<string, unknown>>;
    if (canEditLayout && thisGridRows.length > 0) return thisGridRows;
    return pg.rows as Array<Record<string, unknown>>;
  }, [
    grid,
    paginatedDisplay,
    canEditLayout,
    thisGridRows,
    pg.rows,
  ]);

  const fullGridData = useMemo(
    () => ({ ...gridData, [grid.id]: rows }),
    [gridData, grid.id, rows],
  );

  const { remove, move, add, reorder } = useLayoutActions(
    grid.id,
    schema,
    onSchemaChange,
  );
  const fieldsById = useMemo(() => {
    const map = new Map<string, TrackerField>();
    fields.forEach((field) => map.set(field.id, field));
    return map;
  }, [fields]);

  const layoutNodesByGridId = useMemo(() => {
    const nodes = allLayoutNodes ?? layoutNodes;
    const map = new Map<string, TrackerLayoutNode[]>();
    nodes.forEach((node) => {
      const list = map.get(node.gridId);
      if (list) {
        list.push(node);
      } else {
        map.set(node.gridId, [node]);
      }
    });
    for (const list of map.values()) {
      list.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [allLayoutNodes, layoutNodes]);

  const connectedFieldNodes = useMemo(
    () => layoutNodesByGridId.get(grid.id) ?? [],
    [layoutNodesByGridId, grid.id],
  );

  /** One column per field id — duplicate layout nodes would break React keys and dnd-kit ids. */
  const uniqueFieldLayoutNodes = useMemo(() => {
    const seen = new Set<string>();
    const out: TrackerLayoutNode[] = [];
    for (const node of connectedFieldNodes) {
      if (seen.has(node.fieldId)) continue;
      seen.add(node.fieldId);
      out.push(node);
    }
    return out;
  }, [connectedFieldNodes]);

  const tableFields = useMemo(
    () =>
      uniqueFieldLayoutNodes
        .map((node) => fieldsById.get(node.fieldId))
        .filter((f): f is TrackerField => !!f && !f.config?.isHidden),
    [uniqueFieldLayoutNodes, fieldsById],
  );

  const runtimeForDynamicOptions = useMemo(
    () => ({
      currentGridId: grid.id,
      rowIndex: 0,
      currentRow: thisGridRows[0] ?? {},
    }),
    [grid.id, thisGridRows],
  );

  const fieldSortableIds = useMemo(
    () =>
      uniqueFieldLayoutNodes.map((n) => fieldSortableId(grid.id, n.fieldId)),
    [grid.id, uniqueFieldLayoutNodes],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const handleFieldDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !reorder) return;
      const currentIds = uniqueFieldLayoutNodes.map((n) => n.fieldId);
      const activeParsed = parseFieldId(String(active.id));
      const overParsed = parseFieldId(String(over.id));
      if (
        !activeParsed ||
        !overParsed ||
        activeParsed.gridId !== grid.id ||
        overParsed.gridId !== grid.id
      )
        return;
      const oldIndex = currentIds.indexOf(activeParsed.fieldId);
      const newIndex = currentIds.indexOf(overParsed.fieldId);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(currentIds, oldIndex, newIndex);
      reorder(reordered);
    },
    [grid.id, uniqueFieldLayoutNodes, reorder],
  );

  /**
   * Merges overrides + valueOverrides from the resolver into one flat map.
   * Used by both the snapshot cache (for hiddenColumnIds) and the live callback.
   */
  function mergeRowOverrides(
    overrides: Record<string, FieldRuleOverride>,
    valueOverrides: Record<string, unknown>,
  ): Record<string, FieldRuleOverride> {
    const merged: Record<string, FieldRuleOverride> = { ...overrides };
    for (const [fieldId, val] of Object.entries(valueOverrides)) {
      merged[fieldId] = { ...merged[fieldId], value: val };
    }
    return merged;
  }

  /**
   * Snapshot-based cache: resolves overrides from saved row data.
   * Only used for hiddenColumnIds (column-level static visibility) so we don't
   * re-evaluate on every keystroke when computing which columns to suppress entirely.
   */
  const rowOverridesSnapshot = useMemo(() => {
    const out: Record<number, Record<string, FieldRuleOverride>> = {};
    const rowsToCompute =
      rows.length > 0 ? rows : [{} as Record<string, unknown>];
    rowsToCompute.forEach((row, idx) => {
      const enrichedRow: Record<string, unknown> = { ...row };
      for (const [k, v] of Object.entries(row)) {
        enrichedRow[`${grid.id}.${k}`] = v;
      }
      const { overrides, valueOverrides } = resolveFieldRulesForRow(
        fieldRulesV2,
        grid.id,
        enrichedRow,
        idx,
      );
      out[idx] = mergeRowOverrides(overrides, valueOverrides);
    });
    return out;
  }, [grid.id, rows, fieldRulesV2]);

  const hiddenColumnIds = useMemo(() => {
    const hidden = new Set<string>();
    const allFieldIds = new Set(
      Object.values(rowOverridesSnapshot).flatMap((r) => Object.keys(r)),
    );
    allFieldIds.forEach((fieldId) => {
      const rowCount = Object.keys(rowOverridesSnapshot).length;
      const allHidden =
        rowCount > 0 &&
        Object.values(rowOverridesSnapshot).every(
          (r) => r[fieldId]?.visibility === false,
        );
      if (allHidden) hidden.add(fieldId);
    });
    return hidden;
  }, [rowOverridesSnapshot]);

  /**
   * Live override resolution: called by DataTable with the current in-memory row data
   * (including unsaved edits). This makes onFieldChange rules — and all other rules —
   * react immediately when any field in the row changes during an editing session.
   */
  const getRowOverrides = useCallback(
    (
      rowIndex: number,
      rowData: Record<string, unknown>,
    ): Record<string, FieldRuleOverride> | undefined => {
      if (!fieldRulesV2) return undefined;
      const enrichedRow: Record<string, unknown> = { ...rowData };
      for (const [k, v] of Object.entries(rowData)) {
        enrichedRow[`${grid.id}.${k}`] = v;
      }
      const { overrides, valueOverrides } = resolveFieldRulesForRow(
        fieldRulesV2,
        grid.id,
        enrichedRow,
        rowIndex,
      );
      return mergeRowOverrides(overrides, valueOverrides);
    },
    [grid.id, fieldRulesV2],
  );
  /** For Add Entry form: resolve overrides using only the form values, not row 0 data. */
  const getFieldOverridesForAdd = useCallback(
    (values: Record<string, unknown>, fieldId: string) => {
      const enrichedValues: Record<string, unknown> = { ...values };
      for (const [k, v] of Object.entries(values)) {
        enrichedValues[`${grid.id}.${k}`] = v;
      }
      const { overrides, valueOverrides } = resolveFieldRulesForRow(
        fieldRulesV2,
        grid.id,
        enrichedValues,
        0,
      );
      const base = overrides[fieldId];
      const valOverride = valueOverrides[fieldId];
      return valOverride !== undefined ? { ...base, value: valOverride } : base;
    },
    [grid.id, fieldRulesV2],
  );

  const handleAddColumnConfirm = useCallback(
    (result: Parameters<typeof add>[0]) => {
      add(result);
      setAddColumnOpen(false);
    },
    [add],
  );

  const fieldOptionsMap = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof resolveFieldOptionsV2> | undefined
    >();
    tableFields.forEach((field) => {
      const needsOptions =
        field.dataType === "options" ||
        field.dataType === "multiselect" ||
        field.dataType === "dynamic_select" ||
        field.dataType === "dynamic_multiselect" ||
        field.dataType === "field_mappings";
      if (!needsOptions) {
        map.set(field.id, undefined);
        return;
      }
      const syncOptions = resolveFieldOptionsV2(
        tabId,
        grid.id,
        field,
        bindings,
        fullGridData,
        trackerContext,
        runtimeForDynamicOptions,
      );
      map.set(field.id, asyncDynamicFieldOptions[field.id] ?? syncOptions);
    });
    return map;
  }, [
    tableFields,
    tabId,
    grid.id,
    bindings,
    fullGridData,
    trackerContext,
    runtimeForDynamicOptions,
    asyncDynamicFieldOptions,
  ]);

  useEffect(() => {
    let cancelled = false;
    const dynamicFields = tableFields.filter(
      (field) =>
        field.dataType === "dynamic_select" ||
        field.dataType === "dynamic_multiselect" ||
        field.dataType === "field_mappings",
    );
    if (!trackerContext || dynamicFields.length === 0) {
      setAsyncDynamicFieldOptions((prev) =>
        Object.keys(prev).length === 0 ? prev : {},
      );
      return;
    }

    (async () => {
      const entries = await Promise.all(
        dynamicFields.map(async (field) => {
          try {
            const options = await resolveFieldOptionsV2Async(
              tabId,
              grid.id,
              field,
              bindings,
              fullGridData,
              trackerContext,
              runtimeForDynamicOptions,
            );
            return [field.id, options] as const;
          } catch {
            return [
              field.id,
              [] as ReturnType<typeof resolveFieldOptionsV2>,
            ] as const;
          }
        }),
      );
      if (cancelled) return;
      const next: Record<
        string,
        ReturnType<typeof resolveFieldOptionsV2> | undefined
      > = {};
      for (const [fieldId, options] of entries) {
        next[fieldId] = options;
      }
      setAsyncDynamicFieldOptions(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    tableFields,
    tabId,
    grid.id,
    bindings,
    fullGridData,
    trackerContext,
    runtimeForDynamicOptions,
  ]);

  const bindingByFieldId = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof getBindingForField> | undefined
    >();
    tableFields.forEach((field) => {
      if (field.dataType === "options" || field.dataType === "multiselect") {
        map.set(
          field.id,
          getBindingForField(grid.id, field.id, bindings, tabId),
        );
      }
    });
    return map;
  }, [tableFields, grid.id, bindings, tabId]);

  const gridsById = useMemo(() => {
    const map = new Map<string, TrackerGrid>();
    const grids = trackerContext?.grids;
    if (grids) for (const g of grids) map.set(g.id, g);
    return map;
  }, [trackerContext?.grids]);

  const fieldMetadata = useMemo<FieldMetadata>(() => {
    const meta: FieldMetadata = {};
    const foreignSchemaById = trackerContext?.foreignSchemaBySchemaId;
    const foreignDataById = trackerContext?.foreignGridDataBySchemaId;
    const onAddForeign = trackerContext?.onAddEntryToForeignGrid;
    tableFields.forEach((field) => {
      const opts = fieldOptionsMap.get(field.id);
      const binding = bindingByFieldId.get(field.id);
      const selectFieldPath = `${grid.id}.${field.id}`;
      let optionsGridFields: OptionsGridFieldDef[] | undefined;
      let onAddOption: ((row: Record<string, unknown>) => string) | undefined;
      const sourceId = binding?.optionsSourceSchemaId?.trim();
      const optionsGridId = binding?.optionsGrid?.includes(".")
        ? binding.optionsGrid.split(".").pop()!
        : binding?.optionsGrid;
      const canAddLocal = Boolean(
        binding && onAddEntryToGrid && !sourceId && optionsGridId,
      );
      const canAddForeign = Boolean(
        binding && sourceId && onAddForeign && optionsGridId,
      );
      if (canAddLocal || canAddForeign) {
        const valueFieldId = getValueFieldIdFromBinding(
          binding!,
          selectFieldPath,
        );
        const { fieldId: labelFieldId } = parsePath(binding!.labelField);
        const foreignSlice = sourceId
          ? foreignSchemaById?.[sourceId]
          : undefined;
        const optionLayoutNodes =
          sourceId && foreignSlice
            ? [...(foreignSlice.layoutNodes ?? [])]
              .filter((n) => n.gridId === optionsGridId)
              .sort((a, b) => a.order - b.order)
            : optionsGridId
              ? (layoutNodesByGridId.get(optionsGridId) ?? [])
              : [];
        const fieldsForOptions: Map<string, TrackerField> = sourceId
          ? new Map((foreignSlice?.fields ?? []).map((f) => [f.id, f]))
          : fieldsById;
        optionsGridFields = optionLayoutNodes
          .map((n) => fieldsForOptions.get(n.fieldId))
          .filter((f): f is NonNullable<typeof f> => !!f && !f.config?.isHidden)
          .map((f) => ({
            id: f.id,
            label: f.ui.label,
            type: f.dataType as FieldMetadata[string]["type"],
            config: f.config as FieldMetadata[string]["config"],
            validations:
              validations?.[optionsGridId ? `${optionsGridId}.${f.id}` : f.id],
          }));
        onAddOption = (row: Record<string, unknown>) => {
          if (sourceId && onAddForeign) {
            onAddForeign(sourceId, optionsGridId!, row);
          } else {
            onAddEntryToGrid!(optionsGridId!, row);
          }
          const val = row[valueFieldId ?? ""];
          const label = labelFieldId ? row[labelFieldId] : undefined;
          return String(val ?? label ?? "");
        };
      }
      const getBindingUpdatesFromRow =
        binding && (canAddLocal || canAddForeign)
          ? (row: Record<string, unknown>) => {
            if (!binding?.fieldMappings?.length) return {};
            const selectFieldPathInner = `${grid.id}.${field.id}`;
            const updates = applyBindings(binding, row, selectFieldPathInner);
            const result: Record<string, unknown> = {};
            for (const u of updates) {
              const { gridId: targetGridId, fieldId: targetFieldId } =
                parsePath(u.targetPath);
              if (targetGridId === grid.id && targetFieldId)
                result[targetFieldId] = u.value;
            }
            return result;
          }
          : undefined;
      const sourceDisplay =
        binding?.optionsGrid && optionsGridId
          ? resolveBindingSelectSourceDisplay({
              optionsSourceSchemaId: sourceId,
              optionsGridId,
              currentTrackerSchemaId: trackerContext?.trackerSchemaId,
              localGridData: fullGridData,
              isGridInLocalSchema: (gid) => gridsById.has(gid),
              getLocalOptionsGridDisplayName: (gid) =>
                gridsById.get(gid)?.name,
              foreignGridDataBySchemaId: foreignDataById ?? null,
              foreignSchemaBySchemaId: foreignSchemaById ?? null,
            })
          : null;
      const isLoadingOptions = sourceDisplay?.isLoadingOptions ?? false;
      const optionsGridName = sourceDisplay?.optionsGridDisplayName;
      let lazyOptions: {
        trackerId: string;
        gridId: string;
        labelField: string;
        valueField?: string;
        branchName?: string;
      } | undefined;
      let preSelectedValues: string[] | undefined;

      if (binding?.optionsGrid && optionsGridId) {
        const shouldUseLazyLoading =
          sourceId || (opts && opts.length > 50);

        if (shouldUseLazyLoading) {
          const { fieldId: labelFieldId } = parsePath(binding.labelField);
          const valueFieldId = getValueFieldIdFromBinding(
            binding,
            selectFieldPath,
          );
          const targetTrackerId = sourceId || trackerContext?.trackerSchemaId;

          if (targetTrackerId && labelFieldId) {
            lazyOptions = {
              trackerId: targetTrackerId,
              gridId: optionsGridId,
              labelField: labelFieldId,
              valueField: valueFieldId || undefined,
              branchName: "main",
            };
          }
        }
      }

      meta[field.id] = {
        name: field.ui.label,
        type: field.dataType,
        options: opts?.map((o) => ({
          id: o.id ?? String(o.value ?? ""),
          label: o.label ?? "",
        })),
        config: field.config,
        validations: validations?.[`${grid.id}.${field.id}`],
        calculation: calculations?.[`${grid.id}.${field.id}`],
        optionsGridFields,
        onAddOption,
        getBindingUpdatesFromRow,
        optionsGridName,
        lazyOptions,
        preSelectedValues,
        isLoadingOptions,
      };
    });
    return meta;
  }, [
    tableFields,
    fieldOptionsMap,
    bindingByFieldId,
    grid.id,
    fieldsById,
    layoutNodesByGridId,
    validations,
    calculations,
    onAddEntryToGrid,
    gridsById,
    trackerContext?.foreignSchemaBySchemaId,
    trackerContext?.foreignGridDataBySchemaId,
    trackerContext?.onAddEntryToForeignGrid,
    trackerContext?.trackerSchemaId,
    fullGridData,
  ]);

  const entryWays = useMemo(
    () => buildEntryWaysForGrid({ grid, tabId }),
    [grid, tabId],
  );

  const handleCellUpdate = useCallback(
    (rowIndex: number, columnId: string, value: unknown) => {
      if (mutateRowsViaRowApi) {
        const row = rows[rowIndex] as Record<string, unknown> | undefined;
        const rid = row?._rowId;
        if (typeof rid !== "string") return;
        let mergedAccum: Record<string, unknown> = { ...row, [columnId]: value };

        const nextSlice = rows.map((r, i) =>
          i === rowIndex ? mergedAccum : (r as Record<string, unknown>),
        );
        const tempFull: Record<string, Array<Record<string, unknown>>> = {
          ...(gridData ?? {}),
          [grid.id]: nextSlice,
        };

        const field = fieldsById.get(columnId);
        if (
          field &&
          (field.dataType === "options" || field.dataType === "multiselect")
        ) {
          const binding = bindingByFieldId.get(columnId);
          if (binding?.fieldMappings.length) {
            const selectFieldPath = `${grid.id}.${columnId}`;
            const optionRow = findOptionRow(
              tempFull,
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
                if (targetGridId === grid.id && targetFieldId) {
                  mergedAccum = {
                    ...mergedAccum,
                    [targetFieldId]: update.value,
                  };
                }
              }
            }
          }
        }

        pg.updateRowLocal(String(rid), () => mergedAccum);
        void pg
          .patchRowOnServer(String(rid), rowPayloadForPatch(mergedAccum))
          .catch(() => {
            pg.refetch();
          });
        return;
      }

      if (!onUpdate) return;

      onUpdate(rowIndex, columnId, value);

      const field = fieldsById.get(columnId);
      if (
        field &&
        (field.dataType === "options" || field.dataType === "multiselect")
      ) {
        const binding = bindingByFieldId.get(columnId);
        if (binding && binding.fieldMappings.length > 0) {
          const selectFieldPath = `${grid.id}.${columnId}`;
          const optionRow = findOptionRow(
            fullGridData,
            binding,
            value,
            selectFieldPath,
            foreignGridDataBySchemaId,
          );
          if (optionRow) {
            const updates = applyBindings(binding, optionRow, selectFieldPath);
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
                } else if (targetGridId === grid.id && onUpdate) {
                  onUpdate(rowIndex, targetFieldId, update.value);
                }
              }
            }
          }
        }
      }
    },
    [
      mutateRowsViaRowApi,
      rows,
      pg,
      grid.id,
      gridData,
      bindingByFieldId,
      fieldsById,
      fullGridData,
      foreignGridDataBySchemaId,
      onCrossGridUpdate,
      onUpdate,
    ],
  );

  const handlePaginatedAdd = useCallback(
    (newRow: Record<string, unknown>) => {
      persistNewTrackerGridRow({
        mutateViaRowApi: true,
        pg,
        values: newRow,
      });
    },
    [pg],
  );

  const handlePaginatedDelete = useCallback(
    (indices: number[]) => {
      const ids = indices
        .map((i) => String((rows[i] as Record<string, unknown>)?._rowId ?? ""))
        .filter((s) => s.length > 0);
      if (ids.length === 0) return;
      void pg.deleteRowsOnServer(ids).then(
        () => {
          pg.removeRowsLocal(ids);
        },
        () => {
          pg.refetch();
        },
      );
    },
    [pg, rows],
  );

  const getBindingUpdates = useCallback(
    (fieldId: string, value: unknown): Record<string, unknown> => {
      const binding = bindingByFieldId.get(fieldId);
      if (!binding?.fieldMappings?.length) return {};
      const selectFieldPath = `${grid.id}.${fieldId}`;
      const optionRow = findOptionRow(
        fullGridData,
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
    [bindingByFieldId, grid.id, fullGridData, foreignGridDataBySchemaId],
  );

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      tableFields.map((field, index) => ({
        id: field.id,
        accessorKey: field.id,
        header: canEditLayout
          ? () => (
            <SortableColumnHeaderEdit
              gridId={grid.id}
              fieldId={field.id}
              label={field.ui.label}
              index={index}
              totalColumns={tableFields.length}
              onRemove={() => remove(field.id)}
              onMoveUp={() => move(field.id, "up")}
              onMoveDown={() => move(field.id, "down")}
              onSettings={() => setSettingsFieldId(field.id)}
            />
          )
          : field.ui.label,
        cell: function Cell({ row }) {
          const value = row.getValue(field.id);
          return (
            <TrackerCell
              value={value}
              type={field.dataType}
              options={fieldOptionsMap.get(field.id)}
              config={field.config}
            />
          );
        },
      })),
    [tableFields, canEditLayout, grid.id, remove, move, fieldOptionsMap],
  );

  if (uniqueFieldLayoutNodes.length === 0 && !canEditLayout) {
    if (layoutNodes.length === 0) return null;
    return (
      <div className="p-4 text-muted-foreground">
        Empty Table (No Fields linked)
      </div>
    );
  }
  if (uniqueFieldLayoutNodes.length === 0 && canEditLayout) {
    return (
      <div className="space-y-3">
        {!suppressEmbeddedAddColumn ? (
          <div className="flex h-8 items-center justify-end pb-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAddColumnOpen(true)}
              className="h-7 gap-1.5 px-2 text-xs font-medium text-foreground hover:bg-muted/50 hover:text-foreground"
              aria-label="Add column"
            >
              <Plus className="h-3.5 w-3.5" />
              Add column
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            No columns yet. Use{" "}
            <span className="font-medium text-foreground">Add column</span> in the
            toolbar next to Configure.
          </p>
        )}
        <div className="p-6 rounded-sm border border-dashed border-border text-muted-foreground text-sm text-center">
          No columns yet. Add a column to get started.
        </div>
        <AddColumnOrFieldDialog
          open={addColumnOpen}
          onOpenChange={setAddColumnOpen}
          variant="column"
          existingFieldIds={[]}
          allFields={schema!.fields ?? []}
          onConfirm={handleAddColumnConfirm}
        />
      </div>
    );
  }
  if (tableFields.length === 0)
    return <div className="p-4 text-red-500">Missing Field Definitions</div>;

  const paginationState =
    paginatedDisplay
      ? {
        pageIndex: pg.pageIndex,
        pageSize: pg.pageSize,
      }
      : undefined;

  const tableContent = (
    <>
      {gridIsPaginatedCapable && pg.error ? (
        <div className="mb-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {pg.error}
        </div>
      ) : null}
      {canEditLayout && (
        <AddColumnOrFieldDialog
          open={addColumnOpen}
          onOpenChange={setAddColumnOpen}
          variant="column"
          existingFieldIds={uniqueFieldLayoutNodes.map((n) => n.fieldId)}
          allFields={schema!.fields ?? []}
          onConfirm={handleAddColumnConfirm}
        />
      )}
      {canEditLayout && schema && onSchemaChange && (
        <FieldSettingsDialog
          open={settingsFieldId != null}
          onOpenChange={(open) => {
            if (!open) setSettingsFieldId(null);
          }}
          fieldId={settingsFieldId}
          gridId={grid.id}
          schema={schema}
          onSchemaChange={onSchemaChange}
          trackerSchemaId={editTrackerSchemaId}
        />
      )}
      <DataTable
        columns={columns}
        data={rows}
        fieldMetadata={fieldMetadata}
        getRowOverrides={getRowOverrides}
        hiddenColumns={[...hiddenColumnIds]}
        getFieldOverridesForAdd={getFieldOverridesForAdd}
        onCellUpdate={handleCellUpdate}
        onAddEntry={mutateRowsViaRowApi ? handlePaginatedAdd : onAddEntry}
        onDeleteEntries={
          mutateRowsViaRowApi ? handlePaginatedDelete : onDeleteEntries
        }
        getBindingUpdates={getBindingUpdates}
        config={grid.config}
        gridId={grid.id}
        calculations={calculations}
        gridData={fullGridData}
        addable={
          !readOnly &&
          (mutateRowsViaRowApi || onAddEntry != null) &&
          (grid.config?.isRowAddAble ?? grid.config?.addable ?? true) !== false
        }
        editable={!readOnly && grid.config?.isRowEditAble !== false}
        deletable={
          !readOnly &&
          (mutateRowsViaRowApi || onDeleteEntries != null) &&
          (grid.config?.isRowDeletable ?? grid.config?.isRowDeleteAble) !==
          false
        }
        editLayoutAble={grid.config?.isEditAble !== false}
        pageSize={paginatedDisplay ? pg.pageSize : grid.config?.pageSize}
        pageSizeOptions={
          grid.config?.pageSizeOptions ??
          (paginatedDisplay ? [10, 25, 50] : undefined)
        }
        manualPagination={paginatedDisplay}
        pageCount={paginatedDisplay ? pg.pageCount : undefined}
        pagination={paginationState}
        onPaginationChange={
          paginatedDisplay
            ? (updater) => {
              const next =
                typeof updater === "function"
                  ? updater({
                    pageIndex: pg.pageIndex,
                    pageSize: pg.pageSize,
                  })
                  : updater;
              if (next.pageSize !== pg.pageSize) {
                pg.setPageSize(next.pageSize);
              }
              if (next.pageIndex !== pg.pageIndex) {
                pg.setPageIndex(next.pageIndex);
              }
            }
            : undefined
        }
        totalRows={paginatedDisplay ? pg.total : undefined}
        isLoading={
          gridIsPaginatedCapable &&
          pg.loading &&
          (paginatedDisplay || thisGridRows.length === 0)
        }
        defaultSort={grid.config?.defaultSort}
        entryWays={entryWays}
      />
    </>
  );

  if (canEditLayout) {
    return (
      <div className="w-full min-w-0 space-y-2">
        {!suppressEmbeddedAddColumn ? (
          <div className="flex h-8 items-center justify-end pb-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAddColumnOpen(true)}
              className="h-7 gap-1.5 px-2 text-xs font-medium text-foreground hover:bg-muted/50 hover:text-foreground"
              aria-label="Add column"
            >
              <Plus className="h-3.5 w-3.5" />
              Add column
            </Button>
          </div>
        ) : null}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleFieldDragEnd}
        >
          <SortableContext
            items={fieldSortableIds}
            strategy={horizontalListSortingStrategy}
          >
            {tableContent}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return tableContent;
}

export const TrackerTableGrid = memo(TrackerTableGridInner);
