import type { BoardElement } from "./board-definition";

export const BOARD_GRID_MAX_COLS = 12;

/**
 * Build 2D row structure from flat widget list.
 * Adapted from tracker's layout-utils.ts for board widgets.
 *
 * Widgets are grouped by row number, then sorted by column within each row.
 */
export function buildRowsFromWidgets(
  widgets: BoardElement[],
): BoardElement[][] {
  if (widgets.length === 0) return [];

  const byRow = new Map<number, BoardElement[]>();

  widgets.forEach((widget) => {
    const rowKey = widget.row ?? 0;
    const list = byRow.get(rowKey);
    if (list) {
      list.push(widget);
    } else {
      byRow.set(rowKey, [widget]);
    }
  });

  const rowKeys = [...byRow.keys()].sort((a, b) => a - b);
  const rows: BoardElement[][] = [];

  rowKeys.forEach((rowKey) => {
    const rowWidgets = (byRow.get(rowKey) ?? []).sort(
      (a, b) => (a.col ?? 0) - (b.col ?? 0),
    );
    rows.push(rowWidgets);
  });

  return rows;
}

/**
 * Rebuild widget list from 2D rows with updated positions.
 * Applies row/col metadata and ensures placeId ordering.
 *
 * @param rows - 2D array of widgets (by row, then column)
 * @param existingById - Map of existing widget data to preserve non-layout fields
 */
export function rebuildWidgetsFromRows(
  rows: BoardElement[][],
  existingById: Map<string, BoardElement>,
): BoardElement[] {
  const result: BoardElement[] = [];
  let placeId = 0;

  rows.forEach((rowWidgets, rowIndex) => {
    rowWidgets.forEach((widget) => {
      const existing = existingById.get(widget.id) ?? widget;
      result.push({
        ...existing,
        placeId,
        row: rowIndex,
        col: widget.col ?? 0,
        colSpan: widget.colSpan ?? 6,
        rowSpan: widget.rowSpan ?? 1,
      });
      placeId++;
    });
  });

  return result;
}

/**
 * Find widget location in 2D rows.
 *
 * @returns Row and column index, or null if not found
 */
export function findWidgetRowIndex(
  rows: BoardElement[][],
  widgetId: string,
): { rowIndex: number; colIndex: number } | null {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const c = row.findIndex((w) => w.id === widgetId);
    if (c >= 0) return { rowIndex: r, colIndex: c };
  }
  return null;
}

/**
 * Check if a widget can be placed at a position without collision.
 *
 * @param rows - 2D widget array
 * @param row - Target row index
 * @param col - Target column index (0-11)
 * @param colSpan - Width in columns (1-12)
 * @param excludeId - Widget ID to exclude from collision check (for moving widgets)
 * @returns true if placement is valid, false if collision detected
 */
export function canPlaceWidget(
  rows: BoardElement[][],
  row: number,
  col: number,
  colSpan: number,
  excludeId?: string,
): boolean {
  if (col < 0 || col + colSpan > BOARD_GRID_MAX_COLS) return false;

  const targetRow = rows[row];
  if (!targetRow) return true; // Row doesn't exist yet, placement is valid

  const placeStart = col;
  const placeEnd = col + colSpan;

  // Check for overlap with existing widgets
  for (const widget of targetRow) {
    if (widget.id === excludeId) continue;

    const widgetStart = widget.col ?? 0;
    const widgetEnd = widgetStart + (widget.colSpan ?? 6);

    // Check if ranges overlap
    if (placeStart < widgetEnd && placeEnd > widgetStart) {
      return false; // Collision detected
    }
  }

  return true;
}
