const SELF_SOURCE_ID = "__self__";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Replace optionsSourceSchemaId="__self__" with the provided tracker id.
 * Returns the original tracker when no replacements are needed.
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
    if (source !== SELF_SOURCE_ID) continue;
    nextBindings[fieldPath] = { ...entry, optionsSourceSchemaId: trackerId };
    changed = true;
  }

  if (!changed) return tracker;
  return { ...tracker, bindings: nextBindings };
}
