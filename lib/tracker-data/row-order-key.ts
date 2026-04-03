/** Finite numeric `row_id` used as fractional order key in JSON rows. */
export function isNumericRowId(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function maxNumericRowId(
  rows: Array<Record<string, unknown>>,
): number | null {
  let max: number | null = null;
  for (const row of rows) {
    if (isNumericRowId(row.row_id)) {
      max = max == null ? row.row_id : Math.max(max, row.row_id);
    }
  }
  return max;
}

export function appendRowId(rows: Array<Record<string, unknown>>): number {
  const m = maxNumericRowId(rows);
  return m == null ? 1 : m + 1;
}

function neighborOrderKey(row: Record<string, unknown>): number | null {
  return isNumericRowId(row.row_id) ? row.row_id : null;
}

/**
 * Pick a key strictly between left and right (when both set).
 * Returns collapsed when FP cannot separate or inputs are invalid — caller should renormalize.
 */
export function allocateRowIdBetween(
  left: number | null,
  right: number | null,
): { key: number; collapsed: boolean } {
  if (left != null && right != null && left >= right) {
    return { key: (left + right) / 2, collapsed: true };
  }
  if (left == null && right == null) return { key: 1, collapsed: false };
  if (left == null) {
    const r = right!;
    const k = r - 1;
    if (k < r && Number.isFinite(k)) return { key: k, collapsed: false };
    return { key: r / 2, collapsed: r <= 0 };
  }
  if (right == null) return { key: left + 1, collapsed: false };
  const mid = (left + right) / 2;
  if (mid <= left || mid >= right) return { key: mid, collapsed: true };
  const span = right - left;
  if (
    span <
    Number.EPSILON * Math.max(Math.abs(left), Math.abs(right), 1) * 1e6
  ) {
    return { key: mid, collapsed: true };
  }
  return { key: mid, collapsed: false };
}

export function renormalizeGridRowIds(
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return rows.map((row, i) => ({ ...row, row_id: i + 1 }));
}

export function assignOrderKeyAfterRowMove(
  rows: Array<Record<string, unknown>>,
  movedToIndex: number,
): Array<Record<string, unknown>> {
  if (rows.length === 0) return rows;
  const left =
    movedToIndex > 0 ? neighborOrderKey(rows[movedToIndex - 1]!) : null;
  const right =
    movedToIndex < rows.length - 1
      ? neighborOrderKey(rows[movedToIndex + 1]!)
      : null;
  const { key, collapsed } = allocateRowIdBetween(left, right);
  if (collapsed) {
    // Keep existing row_id values stable; only assign a new key to the moved row.
    const high = maxNumericRowId(rows);
    const fallback = high == null ? 1 : high + 1;
    return rows.map((row, i) =>
      i === movedToIndex ? { ...row, row_id: fallback } : row,
    );
  }
  return rows.map((row, i) =>
    i === movedToIndex ? { ...row, row_id: key } : row,
  );
}
