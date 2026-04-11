import type { BoardDefinition, BoardElement } from "./board-definition";

/** Deep clone for undo stack and optimistic copies (JSON round-trip). */
export function cloneBoardDefinition(d: BoardDefinition): BoardDefinition {
  return JSON.parse(JSON.stringify(d)) as BoardDefinition;
}

/**
 * Get the next placeId for a new block (max placeId + 1).
 * Used when appending blocks from the editor.
 */
export function getNextPlaceId(elements: BoardDefinition["elements"]): number {
  if (elements.length === 0) return 0;
  return Math.max(...elements.map((e) => e.placeId)) + 1;
}

/** Stable order for vertical document UI: sorted by placeId. */
export function sortBoardElementsByDocumentOrder(
  elements: BoardDefinition["elements"],
): BoardDefinition["elements"] {
  return [...elements].sort((a, b) => a.placeId - b.placeId);
}
