import type {
  TrackerDisplayProps,
  TrackerField,
  TrackerLayoutNode,
  TrackerGrid,
} from "../types";
import type { AddColumnOrFieldResult } from "./types";
import { createNewField, getNextLayoutOrder, getNextRowCol } from "./utils";
import type { GridType } from "../types";

/** Default `views[0].config` when inserting a new data grid (best-effort from tracker fields). */
export function defaultViewConfigForNewDataGrid(
  type: "table" | "div" | "kanban" | "calendar" | "timeline",
  fields: TrackerField[] | undefined,
): Record<string, unknown> {
  const f = fields ?? [];
  if (type === "kanban") {
    const gf = f.find(
      (x) =>
        x.dataType === "status" ||
        x.dataType === "options" ||
        x.dataType === "multiselect",
    );
    return gf ? { groupBy: gf.id } : {};
  }
  if (type === "calendar") {
    const df = f.find((x) => x.dataType === "date");
    return df ? { dateField: df.id } : {};
  }
  if (type === "timeline") {
    const dates = f.filter((x) => x.dataType === "date");
    if (dates.length >= 2) {
      return { dateField: dates[0]!.id, endDateField: dates[1]!.id };
    }
    if (dates.length === 1) return { dateField: dates[0]!.id };
    return {};
  }
  return {};
}

export function applyAddColumnOrFieldToSchema(
  schema: TrackerDisplayProps,
  gridId: string,
  result: AddColumnOrFieldResult,
): {
  nextSchema: TrackerDisplayProps;
  addedField: Pick<TrackerField, "id" | "dataType">;
} {
  const currentLayout = schema.layoutNodes ?? [];
  const currentFields = schema.fields ?? [];
  const existingIds = new Set(currentFields.map((f) => f.id));
  const order = getNextLayoutOrder(currentLayout, gridId);
  const { row, col } = getNextRowCol(currentLayout, gridId);

  if (result.mode === "new") {
    const newField = createNewField(
      result.label,
      result.dataType,
      existingIds,
    );
    const nextLayout: TrackerLayoutNode[] = [
      ...currentLayout,
      { gridId, fieldId: newField.id, order, row, col },
    ];
    const nextFields = [...currentFields, newField];
    return {
      nextSchema: {
        ...schema,
        layoutNodes: nextLayout,
        fields: nextFields,
      },
      addedField: { id: newField.id, dataType: newField.dataType },
    };
  }

  const field = currentFields.find((f) => f.id === result.fieldId);
  if (!field) {
    return {
      nextSchema: schema,
      addedField: { id: result.fieldId, dataType: "string" },
    };
  }
  return {
    nextSchema: {
      ...schema,
      layoutNodes: [
        ...currentLayout,
        { gridId, fieldId: result.fieldId, order, row, col },
      ],
    },
    addedField: { id: field.id, dataType: field.dataType },
  };
}

function patchSingleGridViews(
  grid: TrackerGrid,
  activeViewId: string | undefined,
  configPatch: Record<string, unknown>,
): TrackerGrid {
  const views = grid.views?.length ? [...grid.views] : [];
  if (views.length === 0) {
    return {
      ...grid,
      config: { ...(grid.config ?? {}), ...configPatch },
    };
  }
  const idx = activeViewId
    ? views.findIndex((v) => v.id === activeViewId)
    : 0;
  const i = idx >= 0 ? idx : 0;
  const v = views[i];
  if (!v) return grid;
  views[i] = {
    ...v,
    config: { ...(v.config ?? {}), ...configPatch },
  };
  return { ...grid, views };
}

/** Computes view `config` keys to set after a field was added to a calendar, timeline, or kanban grid. */
export function computeDataGridViewPatchAfterFieldAdd(
  viewType: "calendar" | "timeline" | "kanban",
  currentConfig: TrackerGrid["config"] | undefined,
  addedField: Pick<TrackerField, "id" | "dataType">,
): Record<string, unknown> {
  const c = currentConfig ?? {};
  const patch: Record<string, unknown> = {};

  if (viewType === "kanban") {
    if (
      !c.groupBy &&
      (addedField.dataType === "status" ||
        addedField.dataType === "options" ||
        addedField.dataType === "multiselect")
    ) {
      patch.groupBy = addedField.id;
    }
    return patch;
  }

  if (viewType === "calendar") {
    if (addedField.dataType === "date" && !c.dateField) {
      patch.dateField = addedField.id;
    }
    if (
      !c.titleField &&
      (addedField.dataType === "string" || addedField.dataType === "text")
    ) {
      patch.titleField = addedField.id;
    }
    return patch;
  }

  if (addedField.dataType === "date") {
    if (!c.dateField) {
      patch.dateField = addedField.id;
    } else if (c.dateField !== addedField.id && !c.endDateField) {
      patch.endDateField = addedField.id;
    }
  }
  if (
    !c.titleField &&
    (addedField.dataType === "string" || addedField.dataType === "text")
  ) {
    patch.titleField = addedField.id;
  }
  return patch;
}

/**
 * Adds a layout field/column and merges optional view config for calendar / timeline / kanban.
 */
export function applyAddLayoutFieldWithDataGridViewPatch(params: {
  schema: TrackerDisplayProps;
  gridId: string;
  activeViewId: string | undefined;
  viewType: GridType;
  result: AddColumnOrFieldResult;
}): TrackerDisplayProps {
  const { schema, gridId, activeViewId, viewType, result } = params;
  const { nextSchema, addedField } = applyAddColumnOrFieldToSchema(
    schema,
    gridId,
    result,
  );

  if (
    viewType !== "calendar" &&
    viewType !== "timeline" &&
    viewType !== "kanban"
  ) {
    return nextSchema;
  }

  const grid = nextSchema.grids?.find((g) => g.id === gridId);
  if (!grid) return nextSchema;

  const views = grid.views ?? [];
  const activeView =
    (activeViewId ? views.find((v) => v.id === activeViewId) : null) ??
    views[0];
  const configPatch = computeDataGridViewPatchAfterFieldAdd(
    viewType,
    activeView?.config ?? grid.config,
    addedField,
  );
  if (Object.keys(configPatch).length === 0) return nextSchema;

  const nextGrids = (nextSchema.grids ?? []).map((g) =>
    g.id === gridId ? patchSingleGridViews(g, activeViewId, configPatch) : g,
  );
  return { ...nextSchema, grids: nextGrids };
}
