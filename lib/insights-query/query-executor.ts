import type { Prisma } from "@prisma/client";

import type { QueryPlanV1 } from "./schemas";
import { evalComputeExpression, getAtPath, toNumeric } from "./compute-expr";

export type TrackerDataInput = {
  id: string;
  label: string | null;
  branchName: string;
  createdAt: Date;
  updatedAt: Date;
  data: Record<string, unknown>;
};

export function buildTrackerDataWhere(
  trackerSchemaId: string,
  load: QueryPlanV1["load"],
): Prisma.TrackerDataWhereInput {
  const where: Prisma.TrackerDataWhereInput = { trackerSchemaId };

  if (load.branchName === undefined) {
    where.branchName = "main";
  } else if (load.branchName !== null) {
    where.branchName = load.branchName;
  }

  const range = resolveRowTimeRange(load.rowTimeFilter);
  if (range) {
    const field = load.rowTimeFilter?.field ?? "createdAt";
    if (field === "createdAt") {
      where.createdAt = range;
    } else {
      where.updatedAt = range;
    }
  }

  return where;
}

export function resolveRowTimeRange(
  filter: QueryPlanV1["load"]["rowTimeFilter"],
): Prisma.DateTimeFilter | null {
  if (!filter) return null;

  const preset = filter.preset ?? "all";
  if (preset === "all" && !filter.from && !filter.to) return null;

  const now = new Date();
  let gte: Date | undefined;
  let lte: Date | undefined;

  if (filter.from) {
    gte = new Date(filter.from);
  }
  if (filter.to) {
    lte = new Date(filter.to);
  }

  if (!filter.from && !filter.to) {
    if (preset === "last_7_days") {
      gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === "last_30_days" || preset === "last_month") {
      gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === "last_calendar_month") {
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      const firstPrev = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const lastPrev = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      gte = firstPrev;
      lte = lastPrev;
    } else if (preset === "all") {
      return null;
    }
  }

  const out: Prisma.DateTimeFilter = {};
  if (gte) out.gte = gte;
  if (lte) out.lte = lte;
  if (Object.keys(out).length === 0) return null;
  return out;
}

function compareAtPath(
  row: Record<string, unknown>,
  path: string,
  op: QueryPlanV1["filter"][number]["op"],
  value: unknown,
): boolean {
  const rowVal = getAtPath(row, path);
  return compareValues(rowVal, op, value);
}

export function compareValues(
  rowVal: unknown,
  op: QueryPlanV1["filter"][number]["op"],
  value: unknown,
): boolean {
  switch (op) {
    case "eq":
      return (
        rowVal === value ||
        (typeof rowVal === "number" && rowVal === toNumeric(value))
      );
    case "neq":
      return !(
        rowVal === value ||
        (typeof rowVal === "number" && rowVal === toNumeric(value))
      );
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = toNumeric(rowVal);
      const b = toNumeric(value);
      if (a === null || b === null) {
        const sa = rowVal instanceof Date ? rowVal.getTime() : String(rowVal);
        const sb = value instanceof Date ? value.getTime() : String(value);
        const ta = Date.parse(String(sa));
        const tb = Date.parse(String(sb));
        if (!Number.isNaN(ta) && !Number.isNaN(tb)) {
          if (op === "gt") return ta > tb;
          if (op === "gte") return ta >= tb;
          if (op === "lt") return ta < tb;
          return ta <= tb;
        }
        return false;
      }
      if (op === "gt") return a > b;
      if (op === "gte") return a >= b;
      if (op === "lt") return a < b;
      return a <= b;
    }
    case "contains":
      return String(rowVal ?? "")
        .toLowerCase()
        .includes(String(value ?? "").toLowerCase());
    case "starts_with":
      return String(rowVal ?? "")
        .toLowerCase()
        .startsWith(String(value ?? "").toLowerCase());
    case "in":
      return (
        Array.isArray(value) &&
        value.some((v) => compareValues(rowVal, "eq", v))
      );
    default:
      return false;
  }
}

function discoverGridIds(rows: TrackerDataInput[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.data)) {
      if (
        Array.isArray(v) &&
        v.length > 0 &&
        typeof v[0] === "object" &&
        v[0] !== null
      ) {
        set.add(k);
      }
    }
  }
  return [...set];
}

function flattenRows(
  rows: TrackerDataInput[],
  gridIds: string[],
): Record<string, unknown>[] {
  const useGrids = gridIds.length > 0 ? gridIds : discoverGridIds(rows);
  const out: Record<string, unknown>[] = [];

  for (const r of rows) {
    for (const gridId of useGrids) {
      const arr = r.data[gridId];
      if (!Array.isArray(arr)) continue;
      let idx = 0;
      for (const cell of arr) {
        if (!cell || typeof cell !== "object") continue;
        const base: Record<string, unknown> = {
          __dataId: r.id,
          __label: r.label,
          __branchName: r.branchName,
          __createdAt: r.createdAt.toISOString(),
          __updatedAt: r.updatedAt.toISOString(),
          __gridId: gridId,
          __rowIndex: idx,
        };
        idx += 1;
        for (const [key, val] of Object.entries(
          cell as Record<string, unknown>,
        )) {
          if (key.startsWith("__")) continue;
          base[key] = val;
        }
        out.push(base);
      }
    }
  }
  return out;
}

function aggregateRows(
  rows: Record<string, unknown>[],
  groupBy: string[],
  metrics: NonNullable<QueryPlanV1["aggregate"]>["metrics"],
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = groupBy.map((g) => String(getAtPath(row, g) ?? "")).join("\0");
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const result: Record<string, unknown>[] = [];
  for (const [, groupRows] of map) {
    const first = groupRows[0]!;
    const out: Record<string, unknown> = {};
    for (const g of groupBy) {
      out[g] = getAtPath(first, g);
    }
    for (const m of metrics) {
      if (m.op === "count") {
        out[m.name] = groupRows.length;
        continue;
      }
      const nums = groupRows
        .map((r) => {
          if (m.expression != null) {
            return evalComputeExpression(r, m.expression);
          }
          if (m.path != null && m.path !== "") {
            return toNumeric(getAtPath(r, m.path));
          }
          return null;
        })
        .filter((n): n is number => n !== null);
      if (m.op === "sum") {
        out[m.name] = nums.reduce((a, b) => a + b, 0);
      } else if (m.op === "avg") {
        out[m.name] = nums.length
          ? nums.reduce((a, b) => a + b, 0) / nums.length
          : null;
      } else if (m.op === "min") {
        out[m.name] = nums.length ? Math.min(...nums) : null;
      } else if (m.op === "max") {
        out[m.name] = nums.length ? Math.max(...nums) : null;
      }
    }
    result.push(out);
  }
  return result;
}

function sortRows(
  rows: Record<string, unknown>[],
  sort: QueryPlanV1["sort"],
): Record<string, unknown>[] {
  if (sort.length === 0) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    for (const s of sort) {
      const av = getAtPath(a, s.path);
      const bv = getAtPath(b, s.path);
      let cmp = 0;
      const na = toNumeric(av);
      const nb = toNumeric(bv);
      if (na !== null && nb !== null) {
        cmp = na - nb;
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      }
      if (cmp !== 0) return s.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
  return copy;
}

/**
 * Flatten + filter + aggregate + sort + limit. Tracker rows should already respect
 * `load.maxTrackerDataRows` and branch/time filters from Prisma.
 */
export function executeQueryPlan(
  trackerRows: TrackerDataInput[],
  plan: QueryPlanV1,
): Record<string, unknown>[] {
  let flat = flattenRows(trackerRows, plan.flatten.gridIds);
  for (const f of plan.filter) {
    flat = flat.filter((row) => compareAtPath(row, f.path, f.op, f.value));
  }

  let result: Record<string, unknown>[];
  if (plan.aggregate && plan.aggregate.metrics.length > 0) {
    result = aggregateRows(
      flat,
      plan.aggregate.groupBy,
      plan.aggregate.metrics,
    );
  } else {
    result = flat;
  }

  result = sortRows(result, plan.sort);
  if (plan.limit !== undefined) {
    result = result.slice(0, plan.limit);
  }
  return result;
}

export function resultSchemaFromRows(
  rows: Record<string, unknown>[],
  sampleSize: number,
): {
  columns: { key: string; sampleTypes: string }[];
  sample: Record<string, unknown>[];
} {
  if (rows.length === 0) {
    return { columns: [], sample: [] };
  }
  const keys = new Set<string>();
  for (const r of rows.slice(0, Math.min(50, rows.length))) {
    for (const k of Object.keys(r)) {
      keys.add(k);
    }
  }
  const sample = rows.slice(0, sampleSize);
  const columns = [...keys].map((key) => {
    const types = new Set<string>();
    for (const r of sample) {
      const v = r[key];
      types.add(v === null || v === undefined ? "null" : typeof v);
    }
    return { key, sampleTypes: [...types].sort().join("|") };
  });
  return { columns, sample };
}
