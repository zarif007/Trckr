import { getAtPath } from "@/lib/insights-query/compute-expr";

import type { AnalysisBlock, AnalysisChartSpec } from "./analysis-schemas";

const MAX_CHART_POINTS = 120;

type XYChartSpec = Extract<
  AnalysisChartSpec,
  { type: "bar" | "line" | "area" }
>;

function rowToXYPoint(
  row: Record<string, unknown>,
  spec: XYChartSpec,
): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  const x = getAtPath(row, spec.xKey);
  if (x === undefined || x === null) return null;
  out[spec.xKey] = x;
  let anyY = false;
  for (const yk of spec.yKeys) {
    const y = getAtPath(row, yk);
    if (y !== undefined && y !== null) {
      out[yk] = y;
      anyY = true;
    }
  }
  return anyY ? out : null;
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function rowToPiePoint(
  row: Record<string, unknown>,
  spec: Extract<AnalysisChartSpec, { type: "pie" }>,
): Record<string, unknown> | null {
  const name = getAtPath(row, spec.nameKey);
  if (name === undefined || name === null) return null;
  const value = toFiniteNumber(getAtPath(row, spec.valueKey));
  if (value === null) return null;
  const out: Record<string, unknown> = {};
  out[spec.nameKey] = name;
  out[spec.valueKey] = value;
  return out;
}

/** Parse dates or epoch values to milliseconds. */
function coerceToMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 1e11) return v;
    if (v > 1e9) return Math.round(v * 1000);
    return null;
  }
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  if (v instanceof Date) return v.getTime();
  return null;
}

function hydrateGanttRows(
  spec: Extract<AnalysisChartSpec, { type: "gantt" }>,
  rawRows: Record<string, unknown>[],
): Record<string, unknown>[] {
  type RawPoint = { label: string; startMs: number; endMs: number };
  const raw: RawPoint[] = [];
  for (const row of rawRows) {
    if (raw.length >= MAX_CHART_POINTS) break;
    const labelRaw = getAtPath(row, spec.labelKey);
    const startMs = coerceToMs(getAtPath(row, spec.startKey));
    const endMs = coerceToMs(getAtPath(row, spec.endKey));
    if (startMs === null || endMs === null) continue;
    if (endMs <= startMs) continue;
    const label = labelRaw != null ? String(labelRaw) : "—";
    raw.push({ label, startMs, endMs });
  }
  if (raw.length === 0) return [];
  const minStart = Math.min(...raw.map((p) => p.startMs));
  return raw.map((p) => ({
    label: p.label,
    pad: p.startMs - minStart,
    span: p.endMs - p.startMs,
    startMs: p.startMs,
    endMs: p.endMs,
    __ganttMinStart: minStart,
  }));
}

function hydrateChartRows(
  spec: AnalysisChartSpec,
  rawRows: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (spec.type === "gantt") {
    return hydrateGanttRows(spec, rawRows);
  }

  const data: Record<string, unknown>[] = [];
  for (const row of rawRows) {
    if (data.length >= MAX_CHART_POINTS) break;
    let pt: Record<string, unknown> | null = null;
    if (spec.type === "pie") {
      pt = rowToPiePoint(row, spec);
    } else {
      pt = rowToXYPoint(row, spec);
    }
    if (pt) data.push(pt);
  }
  return data;
}

/** Fills chart `data` arrays from query result rows (no LLM — values only from `rawRows`). */
export function hydrateChartDataForBlocks(
  blocks: AnalysisBlock[],
  rawRows: Record<string, unknown>[],
): AnalysisBlock[] {
  return blocks.map((block) => {
    if (!block.chartSpec) return block;
    const data = hydrateChartRows(block.chartSpec, rawRows);
    if (data.length === 0) {
      return { ...block, chartSpec: undefined };
    }
    return { ...block, chartData: data };
  });
}
