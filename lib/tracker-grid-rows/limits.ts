/** Matches server cap in `app/api/trackers/[id]/grids/[gridSlug]/rows/route.ts`. */
export const GRID_ROWS_MAX_LIMIT = 1000;

export const GRID_ROWS_MIN_LIMIT = 1;

export function clampGridRowsLimit(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.min(GRID_ROWS_MAX_LIMIT, Math.max(GRID_ROWS_MIN_LIMIT, Math.floor(n)));
}

export function clampGridRowsOffset(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
