import type { BoardElement } from "./board-definition";
import { BOARD_GRID_MAX_COLS } from "./grid-layout-utils";

/**
 * Calculate the next available position for a new widget.
 * Places widget in the first available slot in the grid.
 *
 * Strategy:
 * 1. If no widgets exist, place at row 0, col 0
 * 2. Otherwise, find the last row and try to fit widget next to existing widgets
 * 3. If row is full, start a new row
 */
export function calculateNextWidgetPosition(
  existingWidgets: BoardElement[],
  colSpan: number = 6,
): { row: number; col: number } {
  if (existingWidgets.length === 0) {
    return { row: 0, col: 0 };
  }

  // Group widgets by row
  const widgetsByRow = new Map<number, BoardElement[]>();
  existingWidgets.forEach((widget) => {
    const row = widget.row ?? 0;
    if (!widgetsByRow.has(row)) {
      widgetsByRow.set(row, []);
    }
    widgetsByRow.get(row)!.push(widget);
  });

  // Get the max row number
  const maxRow = Math.max(...Array.from(widgetsByRow.keys()));

  // Try to fit in the last row
  const lastRowWidgets = widgetsByRow.get(maxRow) || [];
  const sortedWidgets = lastRowWidgets.sort((a, b) => (a.col ?? 0) - (b.col ?? 0));

  // Calculate used columns in the last row
  let nextCol = 0;
  for (const widget of sortedWidgets) {
    const widgetCol = widget.col ?? 0;
    const widgetSpan = widget.colSpan ?? 6;
    nextCol = Math.max(nextCol, widgetCol + widgetSpan);
  }

  // If widget fits in current row, place it there
  if (nextCol + colSpan <= BOARD_GRID_MAX_COLS) {
    return { row: maxRow, col: nextCol };
  }

  // Otherwise, start a new row
  return { row: maxRow + 1, col: 0 };
}
