/**
 * Board (dashboard) domain — client-safe entry (no `server-only` modules).
 *
 * - **Server / Route Handlers**: import `executeBoardForUser` from
 *   `@/lib/boards/execute-board`, persistence from `@/lib/boards/board-repository`.
 * - **Client**: import types, layout helpers, schema fetchers, default widget
 *   builders, and `useUndoableBoardDefinition` from here or subpaths.
 */

export type {
  BoardDefinition,
  BoardElement,
  BoardLayout,
  StatAggregate,
} from "./board-definition";
export {
  BOARD_DEFINITION_VERSION,
  boardDefinitionSchema,
  emptyBoardDefinition,
  parseBoardDefinition,
  safeParseBoardDefinition,
} from "./board-definition";

export type { AssembledSchema } from "./assembled-tracker-schema";
export {
  fetchTrackerAssembledSchema,
  fieldLabelFromAssembledSchema,
  layoutFieldIdsForGrid,
} from "./assembled-tracker-schema";

export type { BoardLayoutSlot } from "./default-board-elements";
export {
  buildDefaultChartElement,
  buildDefaultStatElement,
  buildDefaultTableElement,
} from "./default-board-elements";

export {
  cloneBoardDefinition,
  nextDocumentSlot,
  sortBoardElementsByDocumentOrder,
} from "./document-layout";

export { useUndoableBoardDefinition } from "./use-undoable-board-definition";
