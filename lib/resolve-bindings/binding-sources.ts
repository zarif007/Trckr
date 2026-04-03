import type { TrackerBindings } from "@/lib/types/tracker-bindings";

/** Unique optionsSourceSchemaId values from bindings, excluding empty and the current tracker. */
export function collectOptionsSourceSchemaIds(
  bindings: TrackerBindings | undefined | null,
  currentTrackerSchemaId: string | null | undefined,
): string[] {
  const set = new Set<string>();
  if (!bindings) return [];
  const self = currentTrackerSchemaId?.trim() ?? "";
  const selfPlaceholder = "__self__";
  for (const entry of Object.values(bindings)) {
    if (!entry || typeof entry !== "object") continue;
    const sid =
      "optionsSourceSchemaId" in entry &&
      typeof entry.optionsSourceSchemaId === "string"
        ? entry.optionsSourceSchemaId.trim()
        : "";
    if (!sid || sid === selfPlaceholder || (self && sid === self)) continue;
    set.add(sid);
  }
  return Array.from(set).sort();
}
