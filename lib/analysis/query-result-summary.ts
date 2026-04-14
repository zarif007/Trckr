import {
  ANALYSIS_NUMERIC_STATS_MAX_COLUMNS,
  ANALYSIS_NUMERIC_STATS_ROW_SCAN_CAP,
} from "./constants";

export type NumericColumnSummary = {
  key: string;
  min: number;
  max: number;
  sum: number;
  numericCount: number;
  nullOrMissingCount: number;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Cheap numeric summaries over a bounded row scan for synthesis grounding
 * (aligns prose with aggregates when the row sample is small).
 */
export function buildNumericColumnSummaries(
  rows: Record<string, unknown>[],
): NumericColumnSummary[] {
  if (!rows.length) return [];

  const scanN = Math.min(rows.length, ANALYSIS_NUMERIC_STATS_ROW_SCAN_CAP);
  const keySet = new Set<string>();
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const r = rows[i]!;
    for (const k of Object.keys(r)) {
      if (!k.startsWith("__")) keySet.add(k);
    }
  }
  const keys = [...keySet].sort().slice(0, ANALYSIS_NUMERIC_STATS_MAX_COLUMNS);
  const out: NumericColumnSummary[] = [];

  for (const key of keys) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;
    let numericCount = 0;
    let nullOrMissingCount = 0;

    for (let i = 0; i < scanN; i++) {
      const v = rows[i]![key];
      if (v === undefined || v === null) {
        nullOrMissingCount += 1;
        continue;
      }
      const n = toFiniteNumber(v);
      if (n === null) {
        nullOrMissingCount += 1;
        continue;
      }
      numericCount += 1;
      sum += n;
      if (n < min) min = n;
      if (n > max) max = n;
    }

    if (numericCount < 3) continue;
    out.push({
      key,
      min,
      max,
      sum,
      numericCount,
      nullOrMissingCount,
    });
  }

  return out;
}
