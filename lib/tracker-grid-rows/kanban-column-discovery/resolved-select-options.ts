import { resolveFieldOptionsV2 } from "@/lib/binding";
import type { TrackerContextForOptions } from "@/lib/binding";
import type { TrackerBindings } from "@/lib/types/tracker-bindings";

/**
 * Minimal field shape for `resolveFieldOptionsV2` (matches `FieldWithOptions` in
 * `lib/binding/options.ts`). Keeps this module free of `app/components` imports.
 */
export type FieldForKanbanOptionResolution = {
  id: string;
  dataType?: string;
  config?: unknown;
};

/**
 * Returns true when `resolveFieldOptionsV2` yields at least one option for this field.
 * Kanban can derive column ids from that list alone — no distinct-values HTTP call.
 */
export function fieldHasNonEmptyResolvedOptions(
  tabId: string,
  gridId: string,
  field: FieldForKanbanOptionResolution,
  bindings: TrackerBindings | undefined,
  gridData: Record<string, Array<Record<string, unknown>>>,
  trackerContext?: TrackerContextForOptions | null,
): boolean {
  const opts =
    resolveFieldOptionsV2(
      tabId,
      gridId,
      field,
      bindings,
      gridData,
      trackerContext ?? undefined,
    ) ?? [];
  return opts.length > 0;
}
