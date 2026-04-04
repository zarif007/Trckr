/**
 * Resolve which gridData slice holds rows for a binding (local vs another tracker schema).
 */

import type { TrackerBindingEntry } from "@/lib/types/tracker-bindings";
import { isSelfBinding } from "@/lib/binding/self-bindings";
import type { GridData } from "./grid-data";
import { normalizeOptionsGridId } from "./path";

export type ForeignGridDataBySchemaId = Record<string, GridData>;

export function getOptionsGridRowsForBinding(
  binding: TrackerBindingEntry,
  localGridData: GridData,
  foreignGridDataBySchemaId?: ForeignGridDataBySchemaId | null,
): Record<string, unknown>[] {
  const gridId = normalizeOptionsGridId(binding.optionsGrid);
  if (!gridId) return [];
  const sourceId = binding.optionsSourceSchemaId?.trim();
  if (sourceId && !isSelfBinding(sourceId)) {
    return foreignGridDataBySchemaId?.[sourceId]?.[gridId] ?? [];
  }
  return localGridData[gridId] ?? [];
}
