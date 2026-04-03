/**
 * Field Rules options: Shared-tab section and Rules grid for configuring
 * conditional field behavior (hide/require/disable/set). Field options
 * come from dynamic-options (by function id).
 *
 * Import from @/lib/field-rules-options.
 */

export {
  SHARED_TAB_ID,
  FIELD_RULES_OPTIONS_SECTION_ID,
  FIELD_RULES_RULES_GRID,
} from "./constants";
export type {
  FieldRulesOptionGridsInput,
  FieldRulesOptionGridsResult,
} from "./types";
export { ensureFieldRulesOptionGrids } from "./ensure-grids";
