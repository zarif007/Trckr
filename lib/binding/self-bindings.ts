/** Canonical exported constant for code that still needs to reference the value. */
export const SELF_SOURCE_ID = "ThisTracker";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Returns true when the given optionsSourceSchemaId refers to the current tracker itself.
 * Handles the canonical value ("ThisTracker"), legacy value ("__self__"), and the actual tracker ID.
 *
 * @param sourceId - The optionsSourceSchemaId to check
 * @param currentTrackerId - Optional current tracker's schema ID (when provided, also matches the actual ID)
 */
export function isSelfBinding(
  sourceId: string | null | undefined,
  currentTrackerId?: string | null,
): boolean {
  if (!sourceId) return false;
  const s = sourceId.trim();
  if (s === "ThisTracker" || s === "__self__") return true;
  if (currentTrackerId && s === currentTrackerId.trim()) return true;
  return false;
}

/**
 * Normalizes intra-tracker self-binding source IDs to use the actual tracker ID.
 *
 * Local cross-grid bindings now consistently use the actual tracker ID as optionsSourceSchemaId.
 * The runtime recognizes this via isSelfBinding(sourceId, currentTrackerId) and resolves options
 * from localGridData.
 *
 * - "ThisTracker" / "__self__" → normalized to the actual trackerId
 * - Empty string               → normalized to the actual trackerId (local binding)
 * - <own trackerId>            → kept as-is (already correct)
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
    // Skip if already using the actual tracker ID or a foreign tracker ID
    if (source === trackerId) continue;
    // Normalize self-binding placeholders and empty to actual tracker ID
    if (source === "" || source === "ThisTracker" || source === "__self__") {
      nextBindings[fieldPath] = { ...entry, optionsSourceSchemaId: trackerId };
      changed = true;
    }
  }

  if (!changed) return tracker;
  return { ...tracker, bindings: nextBindings };
}
