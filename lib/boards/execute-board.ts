import "server-only";

import { prisma } from "@/lib/db";
import { listGridRows } from "@/lib/repositories/grid-row-repository";
import type { GridRowData } from "@/lib/schemas/tracker";

import { numberFromCell, stringKeyForCell } from "./cell-values";
import { validateBoardElementBindings } from "./board-binding-validation";
import { boardDefinitionFromRow } from "./board-repository";
import type { BoardDefinition, BoardElement } from "./board-definition";
import {
  buildBoardFieldLabelMap,
  resolveBoardFieldDataKey,
  resolveBoardFieldDataKeyMap,
  resolveBoardGridInternalId,
} from "./resolve-board-tracker-refs";

const PAGE_SIZE = 1000;
const MAX_AGGREGATE_ROWS = 5000;
const TABLE_MAX = 50;

async function loadRowsCapped(
  trackerId: string,
  gridId: string,
  userId: string,
  cap: number,
): Promise<{
  rows: Array<{ data: GridRowData }>;
  total: number;
  truncated: boolean;
}> {
  const rows: Array<{ data: GridRowData }> = [];
  let offset = 0;
  let total = 0;
  let truncated = false;

  while (rows.length < cap) {
    const page = await listGridRows(trackerId, gridId, userId, {
      limit: PAGE_SIZE,
      offset,
    });
    if (!page) {
      return { rows: [], total: 0, truncated: false };
    }
    total = page.total;
    for (const item of page.items) {
      rows.push({ data: item.data as GridRowData });
      if (rows.length >= cap) {
        truncated = rows.length < total;
        return { rows, total, truncated };
      }
    }
    if (page.items.length === 0) break;
    offset += page.items.length;
    if (offset >= total) break;
  }

  truncated = rows.length < total;
  return { rows, total, truncated };
}

export type BoardStatPayload = {
  kind: "stat";
  value: number | null;
  truncated?: boolean;
  error?: string;
};

export type BoardTablePayload = {
  kind: "table";
  columns: { fieldId: string; label: string }[];
  rows: Record<string, unknown>[];
  error?: string;
};

export type BoardChartPayload = {
  kind: "chart";
  chartKind: "bar" | "line";
  points: { key: string; label: string; value: number }[];
  truncated?: boolean;
  error?: string;
};

export type BoardElementPayload =
  | BoardStatPayload
  | BoardTablePayload
  | BoardChartPayload;

export async function executeBoardDefinition(
  definition: BoardDefinition,
  projectId: string,
  moduleId: string | null,
  userId: string,
): Promise<Record<string, BoardElementPayload>> {
  const out: Record<string, BoardElementPayload> = {};

  for (const el of definition.elements) {
    out[el.id] = await executeElement(el, projectId, moduleId, userId);
  }

  return out;
}

async function executeElement(
  element: BoardElement,
  projectId: string,
  moduleId: string | null,
  userId: string,
): Promise<BoardElementPayload> {
  if (element.type === "text") {
    return { kind: "stat", value: 0 };
  }

  const bind = await validateBoardElementBindings(element, projectId, moduleId);
  if (!bind.ok) {
    const err = { error: bind.message } as const;
    if (element.type === "stat") {
      return { kind: "stat", value: null, ...err };
    }
    if (element.type === "table") {
      return { kind: "table", columns: [], rows: [], ...err };
    }
    return {
      kind: "chart",
      chartKind: element.chartKind,
      points: [],
      ...err,
    };
  }

  const { trackerSchemaId, gridId } = element.source;

  if (element.type === "stat") {
    return executeStat(element, trackerSchemaId, gridId, userId);
  }
  if (element.type === "table") {
    return executeTable(element, trackerSchemaId, gridId, userId);
  }
  return executeChart(element, trackerSchemaId, gridId, userId);
}

async function executeStat(
  element: Extract<BoardElement, { type: "stat" }>,
  trackerSchemaId: string,
  gridIdOrSlug: string,
  userId: string,
): Promise<BoardStatPayload> {
  const internalGridId = await resolveBoardGridInternalId(
    trackerSchemaId,
    gridIdOrSlug,
  );
  if (!internalGridId) {
    return { kind: "stat", value: null, error: "Grid not found." };
  }

  const first = await listGridRows(trackerSchemaId, internalGridId, userId, {
    limit: 1,
    offset: 0,
  });
  if (!first) {
    return { kind: "stat", value: null, error: "Unable to load rows." };
  }

  if (element.aggregate === "count") {
    return { kind: "stat", value: first.total };
  }

  const fieldRef = element.source.fieldIds[0];
  if (!fieldRef) {
    return { kind: "stat", value: null, error: "Missing field for aggregate." };
  }

  const dataKey = await resolveBoardFieldDataKey(trackerSchemaId, fieldRef);
  if (!dataKey) {
    return { kind: "stat", value: null, error: "Missing field for aggregate." };
  }

  const { rows, truncated } = await loadRowsCapped(
    trackerSchemaId,
    internalGridId,
    userId,
    MAX_AGGREGATE_ROWS,
  );
  const nums: number[] = [];
  for (const r of rows) {
    const n = numberFromCell(r.data[dataKey]);
    if (n != null) nums.push(n);
  }
  if (nums.length === 0) {
    return { kind: "stat", value: null, truncated, error: undefined };
  }
  if (element.aggregate === "sum") {
    return {
      kind: "stat",
      value: nums.reduce((a, b) => a + b, 0),
      truncated,
    };
  }
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    kind: "stat",
    value: sum / nums.length,
    truncated,
  };
}

async function executeTable(
  element: Extract<BoardElement, { type: "table" }>,
  trackerSchemaId: string,
  gridIdOrSlug: string,
  userId: string,
): Promise<BoardTablePayload> {
  const internalGridId = await resolveBoardGridInternalId(
    trackerSchemaId,
    gridIdOrSlug,
  );
  if (!internalGridId) {
    return { kind: "table", columns: [], rows: [], error: "Grid not found." };
  }

  const maxRows = Math.min(element.maxRows ?? TABLE_MAX, 100);
  const page = await listGridRows(trackerSchemaId, internalGridId, userId, {
    limit: maxRows,
    offset: 0,
  });
  if (!page) {
    return { kind: "table", columns: [], rows: [], error: "Unable to load rows." };
  }

  const labels = await buildBoardFieldLabelMap(
    trackerSchemaId,
    element.source.fieldIds,
  );
  const dataKeyByRef = await resolveBoardFieldDataKeyMap(
    trackerSchemaId,
    element.source.fieldIds,
  );
  const columnKeys: { ref: string; dataKey: string }[] = [];
  for (const ref of element.source.fieldIds) {
    const dataKey = dataKeyByRef.get(ref);
    if (dataKey) columnKeys.push({ ref, dataKey });
  }

  const columns = columnKeys.map(({ ref }) => ({
    fieldId: ref,
    label: labels.get(ref) ?? ref,
  }));

  const rows = page.items.map((row) => {
    const data = row.data as GridRowData;
    const rec: Record<string, unknown> = {};
    for (const { ref, dataKey } of columnKeys) {
      rec[ref] = data[dataKey] ?? null;
    }
    return rec;
  });

  return { kind: "table", columns, rows };
}

async function executeChart(
  element: Extract<BoardElement, { type: "chart" }>,
  trackerSchemaId: string,
  gridIdOrSlug: string,
  userId: string,
): Promise<BoardChartPayload> {
  const internalGridId = await resolveBoardGridInternalId(
    trackerSchemaId,
    gridIdOrSlug,
  );
  if (!internalGridId) {
    return {
      kind: "chart",
      chartKind: element.chartKind,
      points: [],
      error: "Grid not found.",
    };
  }

  const { rows, truncated } = await loadRowsCapped(
    trackerSchemaId,
    internalGridId,
    userId,
    MAX_AGGREGATE_ROWS,
  );

  const chartRefs = [
    element.source.groupByFieldId,
    ...(element.source.metricFieldId ? [element.source.metricFieldId] : []),
  ];
  const chartKeyMap = await resolveBoardFieldDataKeyMap(
    trackerSchemaId,
    chartRefs,
  );

  const groupDataKey = chartKeyMap.get(element.source.groupByFieldId);
  if (!groupDataKey) {
    return {
      kind: "chart",
      chartKind: element.chartKind,
      points: [],
      error: "Invalid group-by field.",
    };
  }

  const metricDataKey = element.source.metricFieldId
    ? chartKeyMap.get(element.source.metricFieldId) ?? null
    : null;

  const groups = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const key = stringKeyForCell(r.data[groupDataKey]);
    const cur = groups.get(key) ?? { sum: 0, count: 0 };
    cur.count += 1;
    if (metricDataKey) {
      const n = numberFromCell(r.data[metricDataKey]);
      if (n != null) cur.sum += n;
    }
    groups.set(key, cur);
  }

  const groupKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const points = groupKeys.map((key) => {
    const g = groups.get(key)!;
    const value = metricDataKey ? g.sum : g.count;
    return { key, label: key === "" ? "(empty)" : key, value };
  });

  return {
    kind: "chart",
    chartKind: element.chartKind,
    points,
    truncated,
  };
}

export async function executeBoardForUser(
  boardId: string,
  userId: string,
): Promise<
  | {
      ok: true;
      elements: Record<string, BoardElementPayload>;
    }
  | { ok: false; error: string }
> {
  const board = await prisma.board.findFirst({
    where: { id: boardId, userId },
    select: {
      definition: true,
      projectId: true,
      moduleId: true,
    },
  });
  if (!board) {
    return { ok: false, error: "Board not found." };
  }

  const definition = boardDefinitionFromRow(board.definition);
  const elements = await executeBoardDefinition(
    definition,
    board.projectId,
    board.moduleId,
    userId,
  );
  return { ok: true, elements };
}
