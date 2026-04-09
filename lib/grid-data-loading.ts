/**
 * Schema-level rules for snapshot vs paginated grids and page sizes.
 * Row hooks and HTTP helpers: `lib/tracker-grid-rows` (README there).
 */
import type { TrackerGrid } from "@/app/components/tracker-display/types";

const SAFE_JSON_PATH_KEY = /^[a-zA-Z0-9_-]{1,128}$/;

/** Field ids / JSON keys used in row.data — rejects injection in raw SQL fragments. */
export function assertSafeJsonPathKey(key: string): void {
  if (!SAFE_JSON_PATH_KEY.test(key)) {
    throw new Error("Invalid JSON path key");
  }
}

export type GridDataLoadingMode = "snapshot" | "paginated";

/** Select / multiselect option list grids need a full snapshot for bindings and small-table UX. */
export function isOptionsGridId(gridId: string): boolean {
  return gridId.endsWith("_options_grid");
}

function gridHasTableOrKanbanSurface(
  grid: Pick<TrackerGrid, "views" | "type">,
): boolean {
  const views = grid.views ?? [];
  if (views.some((v) => v.type === "table" || v.type === "kanban")) {
    return true;
  }
  const legacy = grid.type;
  return legacy === "table" || legacy === "kanban";
}

/**
 * Resolves how grid row data is loaded.
 * - Explicit `config.dataLoading.mode` always wins.
 * - When mode is omitted: table/kanban grids default to **paginated** (per-page / per-column API).
 * - `*_options_grid` and div/timeline/calendar-only grids default to **snapshot**.
 */
export function getGridDataLoadingMode(
  grid: Pick<TrackerGrid, "config" | "id" | "views" | "type">,
): GridDataLoadingMode {
  const explicit = grid.config?.dataLoading?.mode;
  if (explicit === "paginated") return "paginated";
  if (explicit === "snapshot") return "snapshot";
  if (isOptionsGridId(grid.id)) return "snapshot";
  if (gridHasTableOrKanbanSurface(grid)) return "paginated";
  return "snapshot";
}

export function isGridDataPaginated(
  grid: Pick<TrackerGrid, "config" | "id" | "views" | "type">,
): boolean {
  return getGridDataLoadingMode(grid) === "paginated";
}

export function listPaginatedGridSlugs(grids: TrackerGrid[]): string[] {
  return grids.filter(isGridDataPaginated).map((g) => g.id);
}

export function effectivePaginatedPageSize(grid: TrackerGrid): number {
  const fromLoading = grid.config?.dataLoading?.pageSize;
  const fromTable = grid.config?.pageSize;
  const n = fromLoading ?? fromTable ?? 10;
  return Math.min(1000, Math.max(1, n));
}

/** Kanban uses the same page size as the table unless `kanbanPageSize` overrides. */
export function effectiveKanbanPageSize(grid: TrackerGrid): number {
  const override = grid.config?.dataLoading?.kanbanPageSize;
  if (typeof override === "number" && Number.isFinite(override)) {
    return Math.min(500, Math.max(1, override));
  }
  return effectivePaginatedPageSize(grid);
}
