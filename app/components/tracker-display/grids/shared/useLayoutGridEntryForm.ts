"use client";

import { useMemo, useCallback } from "react";
import { resolveFieldOptionsV2 } from "@/lib/binding";
import {
  getBindingForField,
  findOptionRow,
  applyBindings,
  parsePath,
} from "@/lib/resolve-bindings";
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

export interface UseLayoutGridEntryFormParams {
  tabId: string;
  grid: TrackerGrid;
  layoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
  bindings: TrackerBindings;
  fullGridData: Record<string, Array<Record<string, unknown>>>;
  validations?: Record<string, FieldValidationRule[]>;
  calculations?: Record<string, FieldCalculationRule>;
  trackerContext?: TrackerContextForOptions | null;
}

export interface UseLayoutGridEntryFormResult {
  gridFields: TrackerField[];
  fieldMetadata: FieldMetadata;
  fieldOrder: string[];
  getBindingUpdates: (
    fieldId: string,
    value: unknown,
  ) => Record<string, unknown>;
}

/**
 * Builds {@link FieldMetadata} and binding helpers for {@link EntryFormDialog} from layout-connected fields.
 * Shared by calendar, timeline, and kanban-style surfaces that do not need the full table column metadata graph.
 */
export function useLayoutGridEntryForm({
  tabId,
  grid,
  layoutNodes,
  fields,
  bindings,
  fullGridData,
  validations,
  calculations,
  trackerContext,
}: UseLayoutGridEntryFormParams): UseLayoutGridEntryFormResult {
  const connectedFieldNodes = useMemo(
    () =>
      layoutNodes
        .filter((n) => n.gridId === grid.id)
        .sort((a, b) => a.order - b.order),
    [layoutNodes, grid.id],
  );

  const gridFields = useMemo(
    () =>
      connectedFieldNodes
        .map((node) => fields.find((f) => f.id === node.fieldId))
        .filter((f): f is TrackerField => !!f && !f.config?.isHidden),
    [connectedFieldNodes, fields],
  );

  const fieldOrder = useMemo(
    () => gridFields.map((f) => f.id),
    [gridFields],
  );

  const fieldMetadata: FieldMetadata = useMemo(() => {
    const meta: FieldMetadata = {};
    gridFields.forEach((field) => {
      const opts = resolveFieldOptionsV2(
        tabId,
        grid.id,
        field,
        bindings,
        fullGridData,
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
    gridFields,
    bindings,
    fullGridData,
    trackerContext,
    validations,
    calculations,
  ]);

  const foreignGridDataBySchemaId = trackerContext?.foreignGridDataBySchemaId;

  const getBindingUpdates = useCallback(
    (fieldId: string, value: unknown): Record<string, unknown> => {
      const binding = getBindingForField(grid.id, fieldId, bindings, tabId);
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
    [grid.id, bindings, tabId, fullGridData, foreignGridDataBySchemaId],
  );

  return { gridFields, fieldMetadata, fieldOrder, getBindingUpdates };
}
