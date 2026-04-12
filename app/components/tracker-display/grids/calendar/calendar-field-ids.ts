import type { TrackerGrid, TrackerLayoutNode } from "../../types";

/**
 * Resolves which field drives calendar placement vs optional title chip text and duration.
 * Falls back to first layout node for the date axis when config omits `dateField`.
 */
export function resolveCalendarFieldIds(
  layoutNodes: TrackerLayoutNode[],
  config: TrackerGrid["config"] | undefined,
): {
  dateFieldId: string | undefined;
  titleFieldId: string | undefined;
  durationFieldId: string | undefined;
} {
  const dateFieldId =
    (config?.dateField as string | undefined) ?? layoutNodes[0]?.fieldId;
  const titleFieldId =
    (config?.titleField as string | undefined) ??
    layoutNodes.find((n) => n.fieldId !== dateFieldId)?.fieldId;
  const durationFieldId = config?.durationField as string | undefined;

  return { dateFieldId, titleFieldId, durationFieldId };
}
