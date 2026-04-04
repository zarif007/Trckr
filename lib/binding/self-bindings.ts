/** Canonical exported constant for code that still needs to reference the value. */
export const SELF_SOURCE_ID = "ThisTracker";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Returns true when the given optionsSourceSchemaId refers to the current tracker itself.
 * Handles the canonical value ("ThisTracker") and the legacy value ("__self__").
 */
export function isSelfBinding(
  sourceId: string | null | undefined,
): boolean {
  if (!sourceId) return false;
  const s = sourceId.trim();
  return s === "ThisTracker" || s === "__self__";
}

/**
 * Clears intra-tracker self-binding source IDs so that the runtime resolves options
 * from localGridData (the current tracker's own snapshot rows).
 *
 * Local cross-grid bindings work correctly with an empty optionsSourceSchemaId — the
 * runtime falls through to localGridData for any binding whose source is empty or a
 * self-binding placeholder. Storing a real tracker ID breaks this because the runtime
 * then looks in foreignGridDataBySchemaId, where the current tracker's own data is not
 * available as a foreign source.
 *
 * - "ThisTracker" / "__self__" → cleared (optionsSourceSchemaId set to "")
 * - <own trackerId>            → cleared (normalizes bindings saved by old code)
 * - Foreign tracker IDs        → untouched
 *
 * Returns the original tracker when no changes are needed.
 */
export function resolveSelfBindings<T extends Record<string, unknown>>(
  tracker: T,
  trackerId: string,
): T {
  if (!tracker || typeof tracker !== "object") return tracker;
  if (!trackerId) return tracker;
  const bindings = isPlainObject(tracker.bindings)
    ? (tracker.bindings as Record<string, unknown>)
    : null;
  if (!bindings) return tracker;

  let changed = false;
  const nextBindings: Record<string, unknown> = { ...bindings };

  for (const [fieldPath, entry] of Object.entries(nextBindings)) {
    if (!isPlainObject(entry)) continue;
    const source =
      typeof entry.optionsSourceSchemaId === "string"
        ? entry.optionsSourceSchemaId.trim()
        : "";
    if (source === "" || source === "ThisTracker") continue; // already canonical
    if (source === "__self__" || source === trackerId) {
      // Clear the self-reference — local cross-grid bindings use empty source
      nextBindings[fieldPath] = { ...entry, optionsSourceSchemaId: "" };
      changed = true;
    }
  }

  if (!changed) return tracker;
  return { ...tracker, bindings: nextBindings };
}
