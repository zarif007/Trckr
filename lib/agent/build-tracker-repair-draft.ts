/**
 * Builds a compact JSON excerpt of a draft tracker for LLM repair prompts (token control).
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Serializes layout + data wiring slices only (no dataRows, styles, etc.).
 */
export function summarizeTrackerDraftForRepairPrompt(
  draft: Record<string, unknown> | null,
  maxChars: number,
): string {
  if (!draft || !isPlainObject(draft)) return "";
  try {
    const slim = {
      tabs: draft.tabs,
      sections: draft.sections,
      grids: draft.grids,
      fields: draft.fields,
      layoutNodes: draft.layoutNodes,
      bindings: draft.bindings,
    };
    const s = JSON.stringify(slim);
    return s.length > maxChars ? `${s.slice(0, maxChars)}\n…[truncated]` : s;
  } catch {
    return "";
  }
}
