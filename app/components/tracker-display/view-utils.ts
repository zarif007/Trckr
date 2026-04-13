import type { TrackerGrid } from "./types";
import type { GridType } from "./types";
import { getViewLabel } from "./constants";

const KNOWN_GRID_TYPES: readonly GridType[] = [
  "div",
  "table",
  "kanban",
  "timeline",
  "calendar",
];

/**
 * Runtime guard: schema/AI payloads may use unknown strings before Zod runs.
 * Maps anything invalid to `"table"` so UI (icons, labels) never receives `undefined`.
 */
export function normalizeGridType(value: unknown): GridType {
  if (typeof value === "string" && (KNOWN_GRID_TYPES as readonly string[]).includes(value)) {
    return value as GridType;
  }
  return "table";
}

export interface NormalizedView {
  id: string;
  type: GridType;
  name: string;
  config: TrackerGrid["config"];
}

/**
 * Normalizes grid.views or legacy grid.type into a list of views with id, type, name, config.
 */
export function normalizeGridViews(grid: TrackerGrid): NormalizedView[] {
  const rawViews = Array.isArray(grid.views) ? grid.views : [];
  const fallbackViews =
    rawViews.length > 0
      ? rawViews
      : grid.type
        ? [{ type: grid.type, config: grid.config }]
        : [{ type: "table" as const, config: grid.config }];

  return fallbackViews.map((view, index) => {
    const type = normalizeGridType(view.type ?? "table");
    const name = view.name ?? getViewLabel(type);
    const id = view.id ?? `${grid.id}_${type}_view_${index}`;
    return {
      ...view,
      type,
      name,
      id,
      config: view.config ?? {},
    };
  });
}
