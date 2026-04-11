import type { BoardDefinition, BoardElement } from "./board-definition";

/** Deep clone for undo stack and optimistic copies (JSON round-trip). */
export function cloneBoardDefinition(d: BoardDefinition): BoardDefinition {
  return JSON.parse(JSON.stringify(d)) as BoardDefinition;
}

/**
 * Next full-width row in the document-ordered stack (12-column model, `w: 12`).
 * Used when appending widgets from the editor so layout stays consistent.
 */
export function nextDocumentSlot(
  def: BoardDefinition,
  kind: BoardElement["type"],
): { x: number; y: number; w: number; h: number } {
  const bottom = def.elements.reduce(
    (m, e) => Math.max(m, e.layout.y + e.layout.h),
    0,
  );
  const h = kind === "stat" ? 2 : 5;
  return { x: 0, y: bottom, w: 12, h };
}

/** Stable order for vertical document UI: top-to-bottom, then left-to-right. */
export function sortBoardElementsByDocumentOrder(
  elements: BoardDefinition["elements"],
): BoardDefinition["elements"] {
  return [...elements].sort((a, b) => {
    if (a.layout.y !== b.layout.y) return a.layout.y - b.layout.y;
    return a.layout.x - b.layout.x;
  });
}
