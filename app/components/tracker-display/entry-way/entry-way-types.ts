export type EntryWayId = string;

/**
 * Serializable config for an Entry Way on a grid.
 * This lives in TrackerGrid.config so it must stay value-only (no functions).
 */
export interface EntryWayConfig {
  /** Stable id for this Entry Way within the grid. */
  id: EntryWayId;
  /** Label shown in the Entry Way dropdown. */
  label: string;
  /** Optional longer description shown in the menu. */
  description?: string;
  /**
   * Default values to apply when this Entry Way is used.
   * Keys are field ids for the target grid; values are raw cell values.
   */
  defaults?: Record<string, unknown>;
}

/**
 * Runtime context passed when building a row from an Entry Way.
 * Kept small for now; can be extended later if needed.
 */
export interface EntryWayContext {
  gridId: string;
  tabId: string;
}

/**
 * Executable Entry Way used by the UI.
 * buildRow produces the new row that will be sent to onAddEntry.
 */
export interface EntryWayDefinition {
  id: EntryWayId;
  label: string;
  description?: string;
  config: EntryWayConfig;
  buildRow: (ctx: EntryWayContext) => Record<string, unknown>;
}
