import type { TrackerField, TrackerGridView, TrackerLayoutNode } from "../types";
import type { GridType } from "../types";
import { resolveTimelineFieldIds } from "../grids/timeline/timeline-field-ids";

function layoutFieldIdsForGrid(
  gridId: string,
  layoutNodes: TrackerLayoutNode[],
): Set<string> {
  return new Set(
    layoutNodes
      .filter((n) => n.gridId === gridId)
      .map((n) => n.fieldId),
  );
}

function fieldOnGridLayout(
  fieldId: string | undefined,
  onLayout: Set<string>,
  fields: TrackerField[],
): TrackerField | undefined {
  if (!fieldId) return undefined;
  if (!onLayout.has(fieldId)) return undefined;
  return fields.find((f) => f.id === fieldId);
}

/**
 * Returns a user-facing warning when calendar / timeline / kanban active view
 * is missing required config or the key field is not on the grid layout.
 */
export function computeViewKeyWarning(params: {
  gridId: string;
  view: Pick<TrackerGridView, "type" | "config"> | undefined;
  layoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
}): string | null {
  const { gridId, view, layoutNodes, fields } = params;
  if (!view) return null;
  const t = view.type as GridType;
  if (t !== "calendar" && t !== "timeline" && t !== "kanban") return null;

  const onLayout = layoutFieldIdsForGrid(gridId, layoutNodes);
  const cfg = view.config ?? {};

  if (t === "calendar") {
    const df = cfg.dateField as string | undefined;
    if (!df) {
      return "Calendar needs a date key. Open Configure view and set the date field.";
    }
    const fld = fieldOnGridLayout(df, onLayout, fields);
    if (!fld) {
      return "Calendar date field must be a column on this grid. Use Add column or change the key in Configure view.";
    }
    if (fld.dataType !== "date") {
      return "Calendar key must be a date field.";
    }
    return null;
  }

  if (t === "timeline") {
    const gridLayoutNodes = layoutNodes.filter((n) => n.gridId === gridId);
    const { dateFieldId: df, endDateFieldId: ef } = resolveTimelineFieldIds(
      gridLayoutNodes,
      cfg,
      fields,
    );
    if (!df) {
      return "Timeline needs a start date column. Add a date column or set it in Configure view.";
    }
    if (!ef) {
      return "Timeline needs two date columns on this grid for start and end of each bar. Add another date column or set keys in Configure view.";
    }
    const startF = fieldOnGridLayout(df, onLayout, fields);
    const endF = fieldOnGridLayout(ef, onLayout, fields);
    if (!startF || !endF) {
      return "Timeline start and end fields must be columns on this grid. Use Add column or update Configure view.";
    }
    if (startF.dataType !== "date" || endF.dataType !== "date") {
      return "Timeline start and end keys must be date fields.";
    }
    if (df === ef) {
      return "Timeline needs two different date columns for start and end.";
    }
    return null;
  }

  const gb = cfg.groupBy as string | undefined;
  if (!gb) {
    return "Kanban needs a group-by key. Open Configure view and set the grouping field.";
  }
  const fld = fieldOnGridLayout(gb, onLayout, fields);
  if (!fld) {
    return "Kanban group-by field must be a column on this grid. Use Add column or change the key in Configure view.";
  }
  if (
    fld.dataType !== "status" &&
    fld.dataType !== "options" &&
    fld.dataType !== "multiselect"
  ) {
    return "Kanban group-by must be a status, options, or multiselect field.";
  }
  return null;
}
