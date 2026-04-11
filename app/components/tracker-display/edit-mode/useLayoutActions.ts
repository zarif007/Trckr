"use client";

import { useCallback } from "react";
import type {
  TrackerDisplayProps,
  TrackerField,
  TrackerLayoutNode,
} from "../types";
import type { AddColumnOrFieldResult } from "./types";
import { DIV_GRID_MAX_COLS } from "./utils";
import { applyAddColumnOrFieldToSchema } from "./apply-add-layout-field";

/**
 * Hook that returns layout mutation actions for a single grid.
 * Use in TrackerTableGrid or TrackerDivGrid to keep schema update logic in one place.
 */
export function useLayoutActions(
  gridId: string,
  schema: TrackerDisplayProps | undefined,
  onSchemaChange: ((schema: TrackerDisplayProps) => void) | undefined,
) {
  const applySchemaChange = useCallback(
    (nextLayoutNodes: TrackerLayoutNode[], nextFields?: TrackerField[]) => {
      if (!schema || !onSchemaChange) return;
      onSchemaChange({
        ...schema,
        layoutNodes: nextLayoutNodes,
        ...(nextFields != null && { fields: nextFields }),
      });
    },
    [schema, onSchemaChange],
  );

  const remove = useCallback(
    (fieldId: string) => {
      if (!schema) return;
      const next = (schema.layoutNodes ?? []).filter(
        (n) => !(n.gridId === gridId && n.fieldId === fieldId),
      );
      applySchemaChange(next);
    },
    [schema, gridId, applySchemaChange],
  );

  const move = useCallback(
    (fieldId: string, direction: "up" | "down") => {
      if (!schema) return;
      const nodes = (schema.layoutNodes ?? [])
        .filter((n) => n.gridId === gridId)
        .sort((a, b) => a.order - b.order);
      const idx = nodes.findIndex((n) => n.fieldId === fieldId);
      if (idx < 0) return;
      const swap = direction === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= nodes.length) return;
      const rest = (schema.layoutNodes ?? []).filter(
        (n) => n.gridId !== gridId,
      );
      const swapped = [...nodes];
      [swapped[idx], swapped[swap]] = [swapped[swap]!, swapped[idx]!];
      const reordered = swapped.map((n, i) => ({
        ...n,
        order: i,
        row: Math.floor(i / DIV_GRID_MAX_COLS),
        col: i % DIV_GRID_MAX_COLS,
      }));
      applySchemaChange([...rest, ...reordered]);
    },
    [schema, gridId, applySchemaChange],
  );

  const add = useCallback(
    (result: AddColumnOrFieldResult) => {
      if (!schema || !onSchemaChange) return;
      const { nextSchema } = applyAddColumnOrFieldToSchema(
        schema,
        gridId,
        result,
      );
      onSchemaChange(nextSchema);
    },
    [schema, gridId, onSchemaChange],
  );

  /** Reorder fields in this grid by new order of field ids (e.g. from drag end). */
  const reorder = useCallback(
    (fieldIdsInOrder: string[]) => {
      if (!schema) return;
      const rest = (schema.layoutNodes ?? []).filter(
        (n) => n.gridId !== gridId,
      );
      const existingByField = new Map(
        (schema.layoutNodes ?? [])
          .filter((n) => n.gridId === gridId)
          .map((n) => [n.fieldId, n] as const),
      );
      const reordered = fieldIdsInOrder.map((fieldId, i) => {
        const existing = existingByField.get(fieldId);
        return {
          ...existing,
          gridId,
          fieldId,
          order: i,
          row: Math.floor(i / DIV_GRID_MAX_COLS),
          col: i % DIV_GRID_MAX_COLS,
        };
      });
      applySchemaChange([...rest, ...reordered]);
    },
    [schema, gridId, applySchemaChange],
  );

  return { remove, move, add, reorder, applySchemaChange };
}
