/**
 * Field rules are configured per target in field settings (fieldRulesByTarget).
 * This function is a no-op: returns input unchanged with empty seedGridData.
 * Kept for backward compatibility with any code that still calls it.
 */

import type {
  FieldRulesOptionGridsInput,
  FieldRulesOptionGridsResult,
} from "./types";

export function ensureFieldRulesOptionGrids(
  input: FieldRulesOptionGridsInput,
): FieldRulesOptionGridsResult {
  return {
    sections: input.sections,
    grids: input.grids,
    fields: input.fields,
    layoutNodes: input.layoutNodes,
    bindings: input.bindings,
    seedGridData: {},
  };
}
