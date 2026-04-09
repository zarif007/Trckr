import { createEmptyTrackerSchema } from "@/app/components/tracker-display/tracker-editor/constants";
import type { TrackerMeta } from "@/lib/schemas/tracker";
import { MASTER_DATA_VIEW_ID } from "./constants";
import {
  createMasterDataGridId,
  createMasterDataSectionId,
  titleCase,
} from "./utils";

type Grid = { id?: string; sectionId?: string; name?: string };
type Field = { id?: string; dataType?: string; ui?: { label?: string } };
type LayoutNode = { gridId?: string; fieldId?: string; order?: number };

function readSchemaArrays(schema: Record<string, unknown>) {
  const grids = Array.isArray(schema.grids) ? (schema.grids as Grid[]) : [];
  const fields = Array.isArray(schema.fields) ? (schema.fields as Field[]) : [];
  const layoutNodes = Array.isArray(schema.layoutNodes)
    ? (schema.layoutNodes as LayoutNode[])
    : [];
  return { grids, fields, layoutNodes };
}

export function findLabelFieldPathForOptionsBinding(
  schema: Record<string, unknown>,
  selectFieldId: string,
): { gridId: string; labelFieldId: string } | null {
  const { grids, fields, layoutNodes } = readSchemaArrays(schema);
  if (!grids.length || !fields.length || !layoutNodes.length) return null;

  const fieldIds = new Set(
    fields
      .map((f) => f.id)
      .filter((id): id is string => typeof id === "string"),
  );
  const layoutByGrid = new Map<string, string[]>();
  for (const node of layoutNodes) {
    if (!node?.gridId || !node?.fieldId) continue;
    if (!layoutByGrid.has(node.gridId)) layoutByGrid.set(node.gridId, []);
    layoutByGrid.get(node.gridId)!.push(node.fieldId);
  }

  const preferred = fieldIds.has("name") ? "name" : null;
  if (preferred && preferred !== selectFieldId) {
    for (const [gridId, fieldIdsInGrid] of layoutByGrid.entries()) {
      if (fieldIdsInGrid.includes(preferred))
        return { gridId, labelFieldId: preferred };
    }
  }

  for (const [gridId, fieldIdsInGrid] of layoutByGrid.entries()) {
    const candidate = fieldIdsInGrid.find((id) => id && id !== selectFieldId);
    if (candidate) return { gridId, labelFieldId: candidate };
  }

  return null;
}

export function buildMasterDataSchema(
  entityName: string,
): Record<string, unknown> {
  const base = createEmptyTrackerSchema();
  const tabId = base.tabs?.[0]?.id ?? "overview_tab";
  const tabName = base.tabs?.[0]?.name ?? "Overview";
  const sectionId = createMasterDataSectionId(entityName);
  const gridId = createMasterDataGridId(entityName);
  const sectionName = `${titleCase(entityName)} Master Data`;

  return {
    ...base,
    name: undefined,
    masterDataScope: "tracker",
    tabs: [
      {
        id: tabId,
        name: tabName,
        placeId: base.tabs?.[0]?.placeId ?? 0,
        config: {},
      },
    ],
    sections: [
      { id: sectionId, name: sectionName, tabId, placeId: 1, config: {} },
    ],
    grids: [
      {
        id: gridId,
        name: titleCase(entityName),
        sectionId,
        placeId: 1,
        config: {},
        views: [
          { id: MASTER_DATA_VIEW_ID, name: "Table", type: "table", config: {} },
        ],
      },
    ],
    fields: [
      {
        id: "value",
        dataType: "string",
        ui: { label: titleCase(entityName) || "Value" },
        config: { isRequired: true },
      },
    ],
    layoutNodes: [{ gridId, fieldId: "value", order: 1 }],
    bindings: {},
    validations: {},
    calculations: {},
    fieldRules: [],
  };
}

type DbNodeSubset = {
  id: string;
  type: string;
  slug: string;
  name: string;
  placeId: number;
  parentId: string | null;
  config: unknown;
  views: unknown;
};

type DbFieldSubset = {
  id: string;
  slug: string;
  dataType: string;
  ui: unknown;
  config: unknown;
};

type DbLayoutSubset = {
  gridId: string;
  fieldId: string;
  order: number;
  row: number | null;
  col: number | null;
  renderAs: string | null;
};

/**
 * Builds the flat schema record shape used by master-data meta helpers from normalized
 * Prisma rows (`layoutNodes` FKs reference node/field row ids; output uses slugs).
 */
export function flatSchemaRecordFromDbSubset(row: {
  meta: unknown;
  nodes: DbNodeSubset[];
  fields: DbFieldSubset[];
  layoutNodes: DbLayoutSubset[];
}): Record<string, unknown> {
  const nodeById = new Map(row.nodes.map((n) => [n.id, n]));
  const fieldById = new Map(row.fields.map((f) => [f.id, f]));

  const tabs = row.nodes
    .filter((n) => n.type === "TAB")
    .sort((a, b) => a.placeId - b.placeId)
    .map((n) => ({
      id: n.slug,
      name: n.name,
      placeId: n.placeId,
      config: n.config ?? undefined,
    }));

  const sections = row.nodes
    .filter((n) => n.type === "SECTION")
    .sort((a, b) => a.placeId - b.placeId)
    .map((n) => {
      const parent = n.parentId ? nodeById.get(n.parentId) : undefined;
      return {
        id: n.slug,
        name: n.name,
        tabId: parent?.slug ?? "",
        placeId: n.placeId,
        config: n.config ?? undefined,
      };
    });

  const grids = row.nodes
    .filter((n) => n.type === "GRID")
    .sort((a, b) => a.placeId - b.placeId)
    .map((n) => {
      const parent = n.parentId ? nodeById.get(n.parentId) : undefined;
      return {
        id: n.slug,
        name: n.name,
        sectionId: parent?.slug ?? "",
        placeId: n.placeId,
        config: n.config ?? undefined,
        views: Array.isArray(n.views) ? n.views : [],
      };
    });

  const fields = row.fields.map((f) => ({
    id: f.slug,
    dataType: f.dataType,
    ui: f.ui,
    config: f.config ?? undefined,
  }));

  const layoutNodes: Array<Record<string, unknown>> = [];
  for (const ln of row.layoutNodes) {
    const gridNode = nodeById.get(ln.gridId);
    const fieldRow = fieldById.get(ln.fieldId);
    if (!gridNode || gridNode.type !== "GRID" || !fieldRow) continue;
    layoutNodes.push({
      gridId: gridNode.slug,
      fieldId: fieldRow.slug,
      order: ln.order,
      ...(ln.row != null ? { row: ln.row } : {}),
      ...(ln.col != null ? { col: ln.col } : {}),
      ...(ln.renderAs ? { renderAs: ln.renderAs } : {}),
    });
  }

  const meta = row.meta as TrackerMeta | null | undefined;
  const out: Record<string, unknown> = {
    tabs,
    sections,
    grids,
    fields,
    layoutNodes,
  };

  out.masterDataScope = meta?.masterDataScope ?? "tracker";
  if (meta?.masterDataMeta != null && typeof meta.masterDataMeta === "object") {
    out.masterDataMeta = meta.masterDataMeta;
  }
  return out;
}
