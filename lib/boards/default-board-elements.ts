import type { BoardElement, StatAggregate } from "./board-definition";
import {
  layoutFieldIdsForGrid,
  type AssembledSchema,
} from "./assembled-tracker-schema";
import { calculateNextWidgetPosition } from "./calculate-widget-position";

export function buildDefaultStatElement(
  trackerSchemaId: string,
  schema: AssembledSchema,
  placeId: number,
): BoardElement | null {
  const grid = schema.grids?.[0];
  if (!grid) return null;
  const fieldIds = layoutFieldIdsForGrid(schema, grid.id);
  const fid = fieldIds[0];
  return {
    id: crypto.randomUUID(),
    type: "stat",
    placeId,
    row: 0,
    col: 0,
    colSpan: 6,
    rowSpan: 1,
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
  placeId: number,
): BoardElement | null {
  const grid = schema.grids?.[0];
  if (!grid) return null;
  const fieldIds = layoutFieldIdsForGrid(schema, grid.id);
  if (fieldIds.length === 0) return null;
  return {
    id: crypto.randomUUID(),
    type: "table",
    placeId,
    row: 0,
    col: 0,
    colSpan: 12,
    rowSpan: 1,
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
  placeId: number,
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
    placeId,
    row: 0,
    col: 0,
    colSpan: 6,
    rowSpan: 1,
    source: {
      trackerSchemaId,
      gridId: grid.id,
      fieldIds: [],
      groupByFieldId: groupBy,
      metricFieldId: metric,
    },
  };
}

export function buildDefaultTextElement(placeId: number): BoardElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    placeId,
    row: 0,
    col: 0,
    colSpan: 12,
    rowSpan: 1,
    content: "",
  };
}
