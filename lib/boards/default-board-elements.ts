import type { BoardElement, StatAggregate } from "./board-definition";
import {
  layoutFieldIdsForGrid,
  type AssembledSchema,
} from "./assembled-tracker-schema";

export type BoardLayoutSlot = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function buildDefaultStatElement(
  trackerSchemaId: string,
  schema: AssembledSchema,
  layout: BoardLayoutSlot,
): BoardElement | null {
  const grid = schema.grids?.[0];
  if (!grid) return null;
  const fieldIds = layoutFieldIdsForGrid(schema, grid.id);
  const fid = fieldIds[0];
  return {
    id: crypto.randomUUID(),
    type: "stat",
    layout,
    source: {
      trackerSchemaId,
      gridId: grid.id,
      fieldIds: fid ? [fid] : [],
    },
    aggregate: (fid ? "sum" : "count") as StatAggregate,
  };
}

export function buildDefaultTableElement(
  trackerSchemaId: string,
  schema: AssembledSchema,
  layout: BoardLayoutSlot,
): BoardElement | null {
  const grid = schema.grids?.[0];
  if (!grid) return null;
  const fieldIds = layoutFieldIdsForGrid(schema, grid.id);
  if (fieldIds.length === 0) return null;
  return {
    id: crypto.randomUUID(),
    type: "table",
    layout,
    source: {
      trackerSchemaId,
      gridId: grid.id,
      fieldIds: fieldIds.slice(0, 5),
    },
    maxRows: 50,
  };
}

export function buildDefaultChartElement(
  trackerSchemaId: string,
  schema: AssembledSchema,
  layout: BoardLayoutSlot,
): BoardElement | null {
  const grid = schema.grids?.[0];
  if (!grid) return null;
  const fieldIds = layoutFieldIdsForGrid(schema, grid.id);
  const groupBy = fieldIds[0];
  if (!groupBy) return null;
  const metric = fieldIds[1];
  return {
    id: crypto.randomUUID(),
    type: "chart",
    chartKind: "bar",
    layout,
    source: {
      trackerSchemaId,
      gridId: grid.id,
      fieldIds: [],
      groupByFieldId: groupBy,
      metricFieldId: metric,
    },
  };
}
