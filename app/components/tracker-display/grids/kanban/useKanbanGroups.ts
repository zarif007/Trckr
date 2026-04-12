"use client";

/**
 * React hook: Kanban **lane list** + card field metadata from layout + `grid.config.groupBy`.
 *
 * Column ids are computed by {@link buildKanbanGroupColumnDescriptors} in
 * `@/lib/tracker-grid-rows/kanban-column-discovery` so the same rules can be unit-tested
 * without React. Paginated boards pass server distinct values via
 * `distinctValuesFromServer` (see {@link usePaginatedKanbanColumnSources}).
 */

import { useMemo } from "react";
import { resolveFieldOptionsV2 } from "@/lib/binding";
import { buildKanbanGroupColumnDescriptors } from "@/lib/tracker-grid-rows";
import type {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
} from "../../types";
import type { TrackerContextForOptions } from "@/lib/binding";
import type { FieldMetadata } from "../data-table/utils";
import type {
  FieldCalculationRule,
  FieldValidationRule,
} from "@/lib/functions/types";

const toOptionId = (o: { id?: string; value?: unknown; label?: string }) =>
  String(o.id ?? o.value ?? o.label ?? "").trim();

/** Visible fields on the grid in layout order (kanban cards + group-by candidates). */
export function buildKanbanLayoutFields(
  gridId: string,
  layoutNodes: TrackerLayoutNode[],
  fields: TrackerField[],
): TrackerField[] {
  const connectedFieldNodes = layoutNodes
    .filter((n) => n.gridId === gridId)
    .sort((a, b) => a.order - b.order);
  return connectedFieldNodes
    .map((node) => fields.find((f) => f.id === node.fieldId))
    .filter((f): f is TrackerField => !!f && !f.config?.isHidden);
}

export function resolveKanbanGroupByFieldId(
  grid: Pick<TrackerGrid, "config">,
  kanbanFields: TrackerField[],
): string | null {
  if (grid.config?.groupBy) return grid.config.groupBy;
  const optionField = kanbanFields.find(
    (field) =>
      field.dataType === "status" ||
      field.dataType === "options" ||
      field.dataType === "multiselect",
  );
  return optionField?.id ?? kanbanFields[0]?.id ?? null;
}

export interface UseKanbanGroupsParams {
  tabId: string;
  grid: TrackerGrid;
  layoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
  bindings: TrackerBindings;
  validations?: Record<string, FieldValidationRule[]>;
  calculations?: Record<string, FieldCalculationRule>;
  gridData: Record<string, Array<Record<string, unknown>>>;
  trackerContext?: TrackerContextForOptions | null;
  /**
   * Distinct raw values from `GET .../distinct-field-values` when the snapshot has no rows
   * to scan (paginated mode). Wired by {@link usePaginatedKanbanColumnSources}.
   */
  distinctValuesFromServer?: string[];
  /**
   * While true and there are no resolved options and no local values yet, column discovery
   * is pending — {@link buildKanbanGroupColumnDescriptors} returns an empty list (no false
   * single “Uncategorized” lane).
   */
  distinctGroupValuesLoading?: boolean;
}

export interface UseKanbanGroupsResult {
  groups: Array<{ id: string; label: string }>;
  groupByFieldId: string;
  cardFieldsDisplay: Array<{
    id: string;
    dataType: import("../../types").TrackerFieldType;
    label: string;
  }>;
  fieldMetadata: FieldMetadata;
  fieldOrder: string[];
  kanbanFields: TrackerField[];
  rows: Array<Record<string, unknown>>;
}

export function useKanbanGroups({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings,
  validations,
  calculations,
  gridData,
  trackerContext,
  distinctValuesFromServer = [],
  distinctGroupValuesLoading = false,
}: UseKanbanGroupsParams): UseKanbanGroupsResult | null {
  const kanbanFields = useMemo(
    () => buildKanbanLayoutFields(grid.id, layoutNodes, fields),
    [layoutNodes, grid.id, fields],
  );

  const rows = useMemo(() => gridData[grid.id] ?? [], [gridData, grid.id]);

  const groupByFieldId = useMemo(
    () => resolveKanbanGroupByFieldId(grid, kanbanFields),
    [grid, kanbanFields],
  );

  const groupingField = useMemo(() => {
    if (!groupByFieldId) return null;
    return kanbanFields.find((field) => field.id === groupByFieldId) ?? null;
  }, [kanbanFields, groupByFieldId]);

  const options = useMemo(() => {
    if (!groupingField) return [];
    return (
      resolveFieldOptionsV2(
        tabId,
        grid.id,
        groupingField,
        bindings,
        gridData,
        trackerContext ?? undefined,
      ) ?? []
    );
  }, [tabId, grid.id, groupingField, bindings, gridData, trackerContext]);

  const groups = useMemo(() => {
    if (!groupByFieldId) return [];
    return buildKanbanGroupColumnDescriptors({
      groupByFieldId,
      resolvedOptions: options,
      rows,
      serverDistinctValues: distinctValuesFromServer,
      distinctValuesLoading: distinctGroupValuesLoading,
    }).columns;
  }, [
    options,
    rows,
    groupByFieldId,
    distinctValuesFromServer,
    distinctGroupValuesLoading,
  ]);

  const cardFieldsDisplay = useMemo(
    () =>
      kanbanFields
        .filter((f) => f.id !== groupByFieldId)
        .map((f) => ({ id: f.id, dataType: f.dataType, label: f.ui.label })),
    [kanbanFields, groupByFieldId],
  );

  const fieldMetadata: FieldMetadata = useMemo(() => {
    const meta: FieldMetadata = {};
    kanbanFields.forEach((field) => {
      const opts = resolveFieldOptionsV2(
        tabId,
        grid.id,
        field,
        bindings,
        gridData,
        trackerContext ?? undefined,
      );
      meta[field.id] = {
        name: field.ui.label,
        type: field.dataType,
        options: opts?.map((o) => ({
          id: toOptionId(o),
          label: o.label ?? "",
        })),
        config: field.config,
        validations: validations?.[`${grid.id}.${field.id}`],
        calculation: calculations?.[`${grid.id}.${field.id}`],
      };
    });
    return meta;
  }, [
    tabId,
    grid.id,
    kanbanFields,
    bindings,
    gridData,
    trackerContext,
    validations,
    calculations,
  ]);

  const fieldOrder = useMemo(
    () => kanbanFields.map((f) => f.id),
    [kanbanFields],
  );

  if (!groupByFieldId || !groupingField) return null;

  return {
    groups,
    groupByFieldId,
    cardFieldsDisplay,
    fieldMetadata,
    fieldOrder,
    kanbanFields,
    rows,
  };
}
