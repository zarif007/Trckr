import type { BoardElement, StatAggregate } from "./board-definition";
import type { AssembledSchema } from "./assembled-tracker-schema";
import { layoutFieldIdsForGrid } from "./assembled-tracker-schema";

/**
 * If the element's `gridId` is missing from `schema`, snap to the first grid
 * and reset field bindings to valid defaults for that grid.
 */
export function snapBoardElementToSchema(
  element: BoardElement,
  schema: AssembledSchema,
): BoardElement {
  if (element.type === "text") return element;

  const grids = schema.grids ?? [];
  if (grids.length === 0) return element;

  let gridId = element.source.gridId;
  if (!grids.some((g) => g.id === gridId)) {
    gridId = grids[0]!.id;
  }

  const fieldIds = layoutFieldIdsForGrid(schema, gridId);
  const first = fieldIds[0];
  const second = fieldIds[1];

  if (element.type === "stat") {
    const canNumeric = Boolean(first);
    const aggregate: StatAggregate =
      !canNumeric || element.aggregate === "count"
        ? "count"
        : element.aggregate;
    return {
      ...element,
      source: {
        ...element.source,
        gridId,
        fieldIds: aggregate === "count" ? [] : [first!],
      },
      aggregate,
    };
  }

  if (element.type === "table") {
    const preserved = element.source.fieldIds.filter((id) =>
      fieldIds.includes(id),
    );
    const nextFields =
      fieldIds.length === 0
        ? []
        : preserved.length > 0
          ? preserved.slice(0, 12)
          : fieldIds.slice(0, 5);
    return {
      ...element,
      source: {
        ...element.source,
        gridId,
        fieldIds: nextFields,
      },
    };
  }

  if (element.type === "chart") {
    if (!first) {
      return { ...element, source: { ...element.source, gridId, fieldIds: [] } };
    }
    const groupBy = fieldIds.includes(element.source.groupByFieldId)
      ? element.source.groupByFieldId
      : first;
    const metricRaw = element.source.metricFieldId;
    const metric =
      metricRaw && fieldIds.includes(metricRaw) && metricRaw !== groupBy
        ? metricRaw
        : second && second !== groupBy
          ? second
          : undefined;
    return {
      ...element,
      source: {
        ...element.source,
        gridId,
        fieldIds: [],
        groupByFieldId: groupBy,
        metricFieldId: metric,
      },
    };
  }

  return element;
}
