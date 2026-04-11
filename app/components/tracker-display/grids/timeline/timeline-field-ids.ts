import type { TrackerGrid, TrackerField, TrackerLayoutNode } from "../../types";

/**
 * Resolves timeline key columns from view config and grid layout.
 * When `endDateField` is omitted but the grid has two or more date columns in layout
 * order, the second date column is used as the end of the bar range so the timeline
 * always spans start → end when the schema supports it.
 */
export function resolveTimelineFieldIds(
  layoutNodes: TrackerLayoutNode[],
  config: TrackerGrid["config"] | undefined,
  fields: TrackerField[],
): {
  dateFieldId: string | undefined;
  endDateFieldId: string | undefined;
  titleFieldId: string | undefined;
  swimlaneFieldId: string | undefined;
} {
  const fieldById = new Map(fields.map((f) => [f.id, f]));

  const orderedLayoutFieldIds = [...layoutNodes]
    .sort((a, b) => a.order - b.order)
    .map((n) => n.fieldId);

  const dateFieldIdsInLayoutOrder = orderedLayoutFieldIds.filter(
    (id) => fieldById.get(id)?.dataType === "date",
  );

  const configuredStart = config?.dateField as string | undefined;
  const dateFieldId =
    configuredStart && dateFieldIdsInLayoutOrder.includes(configuredStart)
      ? configuredStart
      : (dateFieldIdsInLayoutOrder[0] ?? undefined);

  const configuredEnd = config?.endDateField as string | undefined;
  let endDateFieldId: string | undefined =
    configuredEnd &&
    dateFieldIdsInLayoutOrder.includes(configuredEnd) &&
    configuredEnd !== dateFieldId
      ? configuredEnd
      : undefined;

  if (!endDateFieldId && dateFieldId) {
    endDateFieldId = dateFieldIdsInLayoutOrder.find((id) => id !== dateFieldId);
  }

  const rangeIds = new Set(
    [dateFieldId, endDateFieldId].filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    ),
  );

  const configuredTitle = config?.titleField as string | undefined;
  const titleFieldId =
    configuredTitle &&
    orderedLayoutFieldIds.includes(configuredTitle) &&
    !rangeIds.has(configuredTitle)
      ? configuredTitle
      : orderedLayoutFieldIds.find(
          (id) =>
            !rangeIds.has(id) && fieldById.get(id)?.dataType !== "date",
        );

  const swimlaneFieldId = config?.swimlaneField as string | undefined;

  return { dateFieldId, endDateFieldId, titleFieldId, swimlaneFieldId };
}
