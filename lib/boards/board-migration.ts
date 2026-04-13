import type { BoardDefinition, BoardElement } from "./board-definition";

/**
 * Legacy v2 board definition schema (before grid layout)
 */
interface BoardDefinitionV2 {
  version: 2;
  elements: Array<Omit<BoardElement, "row" | "col" | "colSpan" | "rowSpan">>;
}

/**
 * Migrate v2 board definition (linear placeId ordering) to v3 (grid layout).
 *
 * Strategy: Place widgets in 2-column grid, left-to-right, top-to-bottom.
 * Each widget gets colSpan: 6 (half width).
 */
export function migrateBoardDefinitionV2toV3(
  def: BoardDefinitionV2,
): BoardDefinition {
  const sortedElements = [...def.elements].sort(
    (a, b) => a.placeId - b.placeId,
  );

  let row = 0;
  let col = 0;
  const COLS_PER_ROW = 12;
  const DEFAULT_COL_SPAN = 6; // Half width (2 columns)

  const migratedElements: BoardElement[] = sortedElements.map((el) => {
    const positioned = {
      ...el,
      row,
      col,
      colSpan: DEFAULT_COL_SPAN,
      rowSpan: 1,
    } as BoardElement;

    // Move to next column
    col += DEFAULT_COL_SPAN;

    // Wrap to next row if we've filled 12 columns
    if (col >= COLS_PER_ROW) {
      col = 0;
      row++;
    }

    return positioned;
  });

  return {
    version: 3,
    elements: migratedElements,
  };
}

/**
 * Sort board elements by document order (placeId).
 * Used during migration to ensure consistent positioning.
 */
export function sortBoardElementsByDocumentOrder<
  T extends { placeId: number },
>(elements: T[]): T[] {
  return [...elements].sort((a, b) => a.placeId - b.placeId);
}
