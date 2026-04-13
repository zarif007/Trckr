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
  StatAggregate,
  StatElement,
  TableElement,
  ChartElement,
  TextElement,
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

export {
  buildDefaultChartElement,
  buildDefaultStatElement,
  buildDefaultTableElement,
  buildDefaultTextElement,
} from "./default-board-elements";

export { snapBoardElementToSchema } from "./snap-board-element-to-schema";

export {
  cloneBoardDefinition,
  getNextPlaceId,
  sortBoardElementsByDocumentOrder,
} from "./document-layout";

export { useUndoableBoardDefinition } from "./use-undoable-board-definition";
