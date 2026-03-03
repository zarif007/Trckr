/**
 * Depends On is now configured per target in field settings (dependsOnByTarget).
 * This function is a no-op: returns input unchanged with empty seedGridData.
 * Kept for backward compatibility with any code that still calls it.
 */

import type { DependsOnOptionGridsInput, DependsOnOptionGridsResult } from './types'

export function ensureDependsOnOptionGrids(
  input: DependsOnOptionGridsInput
): DependsOnOptionGridsResult {
  return {
    sections: input.sections,
    grids: input.grids,
    fields: input.fields,
    layoutNodes: input.layoutNodes,
    bindings: input.bindings,
    seedGridData: {},
  }
}
