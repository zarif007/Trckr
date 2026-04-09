/**
 * Decomposes the flat TrackerSchema (AI output / legacy JSON) into normalized
 * DB row inputs suitable for the tracker repository's create/update operations.
 */

import {
  trackerSchema as trackerSchemaZod,
  type TrackerSchema,
  type TrackerMeta,
} from "@/lib/schemas/tracker";
import type {
  TrackerNodeRow,
  TrackerFieldRow,
  TrackerLayoutNodeRow,
  TrackerBindingRow,
  TrackerValidationRow,
  TrackerCalculationRow,
  TrackerDynamicOptionRow,
  TrackerFieldRuleRow,
} from "@/lib/schemas/tracker";

type OmitIdAndTracker<T> = Omit<T, "id" | "trackerId">;

export interface DecomposedSchema {
  meta: TrackerMeta | null;
  nodes: OmitIdAndTracker<TrackerNodeRow>[];
  fields: OmitIdAndTracker<TrackerFieldRow>[];
  layoutNodes: OmitIdAndTracker<TrackerLayoutNodeRow>[];
  bindings: OmitIdAndTracker<TrackerBindingRow>[];
  validations: OmitIdAndTracker<TrackerValidationRow>[];
  calculations: OmitIdAndTracker<TrackerCalculationRow>[];
  dynamicOptions: OmitIdAndTracker<TrackerDynamicOptionRow>[];
  fieldRules: OmitIdAndTracker<TrackerFieldRuleRow>[];
}

// ---------------------------------------------------------------------------
// Main decomposer
// ---------------------------------------------------------------------------

export function decomposeTrackerSchema(
  schema: TrackerSchema,
): DecomposedSchema {
  const nodes = decomposeNodes(schema);

  const nodeSlugToId = new Map<string, string>();
  for (const n of nodes) {
    nodeSlugToId.set(n.slug, n.slug);
  }

  const fieldSlugs = new Set((schema.fields ?? []).map((f) => f.id));

  const fields = decomposeFields(schema);
  const layoutNodes = decomposeLayoutNodes(schema);
  const bindings = decomposeBindings(schema, nodeSlugToId, fieldSlugs);
  const validations = decomposeValidations(schema, nodeSlugToId, fieldSlugs);
  const calculations = decomposeCalculations(schema, nodeSlugToId, fieldSlugs);
  const dynamicOptions = decomposeDynamicOptions(schema, nodeSlugToId, fieldSlugs);
  const fieldRules = decomposeFieldRules(schema, nodeSlugToId, fieldSlugs);

  const meta: TrackerMeta | null = {
    masterDataScope: schema.masterDataScope,
    formActions: schema.formActions ?? [
      {
        id: "default_save_action",
        label: "Save",
        statusTag: "Saved",
        isEditable: true,
      },
    ],
    ...(schema.dynamicOptions?.connectors
      ? { dynamicConnectors: schema.dynamicOptions.connectors as Record<string, unknown> }
      : {}),
  };

  return {
    meta,
    nodes,
    fields,
    layoutNodes,
    bindings,
    validations,
    calculations,
    dynamicOptions,
    fieldRules,
  };
}

/**
 * Parses a flat tracker JSON object and returns decomposed rows for persistence.
 * Preserves root-level `masterDataMeta` (from `withMasterDataMeta`) inside `TrackerSchema.meta`.
 */
export function decomposedPersistInputFromFlatRecord(
  flat: Record<string, unknown>,
): DecomposedSchema {
  const zodResult = trackerSchemaZod.safeParse(flat);
  const parsed: TrackerSchema = zodResult.success
    ? zodResult.data
    : (flat as TrackerSchema);
  const decomposed = decomposeTrackerSchema(parsed);
  const masterDataMeta = flat.masterDataMeta;
  const meta: TrackerMeta | null =
    decomposed.meta &&
    masterDataMeta != null &&
    typeof masterDataMeta === "object"
      ? { ...decomposed.meta, masterDataMeta }
      : decomposed.meta;
  return { ...decomposed, meta };
}

// ---------------------------------------------------------------------------
// Node decomposition (tabs → sections → grids)
// ---------------------------------------------------------------------------

function decomposeNodes(
  schema: TrackerSchema,
): OmitIdAndTracker<TrackerNodeRow>[] {
  const nodes: OmitIdAndTracker<TrackerNodeRow>[] = [];

  for (const tab of schema.tabs ?? []) {
    nodes.push({
      type: "TAB",
      slug: tab.id,
      name: tab.name,
      placeId: tab.placeId ?? 0,
      parentId: null,
      config: tab.config ?? null,
      views: null,
    });
  }

  for (const section of schema.sections ?? []) {
    nodes.push({
      type: "SECTION",
      slug: section.id,
      name: section.name,
      placeId: section.placeId ?? 0,
      parentId: section.tabId,
      config: section.config ?? null,
      views: null,
    });
  }

  for (const grid of schema.grids ?? []) {
    nodes.push({
      type: "GRID",
      slug: grid.id,
      name: grid.name,
      placeId: grid.placeId ?? 0,
      parentId: grid.sectionId,
      config: grid.config ?? null,
      views: grid.views ?? null,
    });
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Field decomposition
// ---------------------------------------------------------------------------

function decomposeFields(
  schema: TrackerSchema,
): OmitIdAndTracker<TrackerFieldRow>[] {
  return (schema.fields ?? []).map((f) => ({
    slug: f.id,
    dataType: f.dataType,
    ui: f.ui as TrackerFieldRow["ui"],
    config: f.config ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Layout node decomposition
// ---------------------------------------------------------------------------

function decomposeLayoutNodes(
  schema: TrackerSchema,
): OmitIdAndTracker<TrackerLayoutNodeRow>[] {
  return (schema.layoutNodes ?? []).map((ln) => ({
    gridId: ln.gridId,
    fieldId: ln.fieldId,
    order: ln.order,
    row: ln.row ?? null,
    col: ln.col ?? null,
    renderAs: ln.renderAs ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Binding decomposition
// ---------------------------------------------------------------------------

function decomposeBindings(
  schema: TrackerSchema,
  nodeSlugToId: Map<string, string>,
  fieldSlugs: Set<string>,
): OmitIdAndTracker<TrackerBindingRow>[] {
  const bindings = schema.bindings ?? {};
  const result: OmitIdAndTracker<TrackerBindingRow>[] = [];

  for (const [key, entry] of Object.entries(bindings)) {
    const [targetGridSlug, targetFieldSlug] = key.split(".");
    if (!targetGridSlug || !targetFieldSlug) continue;

    const targetGridId = nodeSlugToId.get(targetGridSlug);
    if (!targetGridId) continue;
    if (!fieldSlugs.has(targetFieldSlug)) continue;

    const sourceGridSlug = entry.optionsGrid;
    const sourceGridId = entry.optionsSourceSchemaId
      ? null
      : nodeSlugToId.get(sourceGridSlug) ?? null;

    const labelFieldParts = entry.labelField.split(".");
    const sourceFieldSlug = labelFieldParts[1] ?? labelFieldParts[0] ?? "";
    const sourceFieldId = entry.optionsSourceSchemaId
      ? null
      : fieldSlugs.has(sourceFieldSlug) ? sourceFieldSlug : null;

    result.push({
      sourceGridId,
      sourceFieldId,
      targetGridId: targetGridSlug,
      targetFieldId: targetFieldSlug,
      config: {
        optionsSourceSchemaId: entry.optionsSourceSchemaId,
        optionsSourceKey: entry.optionsSourceKey,
        optionsGrid: entry.optionsGrid,
        labelField: entry.labelField,
        fieldMappings: entry.fieldMappings ?? [],
      },
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Validation decomposition
// ---------------------------------------------------------------------------

function decomposeValidations(
  schema: TrackerSchema,
  nodeSlugToId: Map<string, string>,
  fieldSlugs: Set<string>,
): OmitIdAndTracker<TrackerValidationRow>[] {
  const validations = schema.validations ?? {};
  const result: OmitIdAndTracker<TrackerValidationRow>[] = [];

  for (const [key, rules] of Object.entries(validations)) {
    const [gridSlug, fieldSlug] = key.split(".");
    if (!gridSlug || !fieldSlug) continue;
    if (!nodeSlugToId.has(gridSlug) || !fieldSlugs.has(fieldSlug)) continue;

    result.push({
      gridId: gridSlug,
      fieldId: fieldSlug,
      rules: rules as unknown[],
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Calculation decomposition
// ---------------------------------------------------------------------------

function decomposeCalculations(
  schema: TrackerSchema,
  nodeSlugToId: Map<string, string>,
  fieldSlugs: Set<string>,
): OmitIdAndTracker<TrackerCalculationRow>[] {
  const calculations = schema.calculations ?? {};
  const result: OmitIdAndTracker<TrackerCalculationRow>[] = [];

  for (const [key, expr] of Object.entries(calculations)) {
    const [gridSlug, fieldSlug] = key.split(".");
    if (!gridSlug || !fieldSlug) continue;
    if (!nodeSlugToId.has(gridSlug) || !fieldSlugs.has(fieldSlug)) continue;

    result.push({
      gridId: gridSlug,
      fieldId: fieldSlug,
      expression: expr as TrackerCalculationRow["expression"],
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Dynamic options decomposition
// ---------------------------------------------------------------------------

function decomposeDynamicOptions(
  schema: TrackerSchema,
  nodeSlugToId: Map<string, string>,
  fieldSlugs: Set<string>,
): OmitIdAndTracker<TrackerDynamicOptionRow>[] {
  const defs = schema.dynamicOptions?.functions;
  if (!defs) return [];

  const result: OmitIdAndTracker<TrackerDynamicOptionRow>[] = [];

  const fieldToGrid = new Map<string, string>();
  for (const ln of schema.layoutNodes ?? []) {
    fieldToGrid.set(ln.fieldId, ln.gridId);
  }

  for (const [_funcId, funcDef] of Object.entries(defs)) {
    for (const field of schema.fields ?? []) {
      const fConfig = field.config as Record<string, unknown> | null;
      if (fConfig?.dynamicOptionsFunction === _funcId) {
        const gridSlug = fieldToGrid.get(field.id);
        if (!gridSlug || !nodeSlugToId.has(gridSlug)) continue;
        if (!fieldSlugs.has(field.id)) continue;

        result.push({
          gridId: gridSlug,
          fieldId: field.id,
          definition: funcDef,
        });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Field rules decomposition
// ---------------------------------------------------------------------------

function decomposeFieldRules(
  schema: TrackerSchema,
  nodeSlugToId: Map<string, string>,
  fieldSlugs: Set<string>,
): OmitIdAndTracker<TrackerFieldRuleRow>[] {
  const rules = schema.fieldRulesV2;
  if (!rules) return [];

  const result: OmitIdAndTracker<TrackerFieldRuleRow>[] = [];

  for (const [key, ruleList] of Object.entries(rules)) {
    const [gridSlug, fieldSlug] = key.split(".");
    if (!gridSlug || !fieldSlug) continue;
    if (!nodeSlugToId.has(gridSlug) || !fieldSlugs.has(fieldSlug)) continue;

    result.push({
      gridId: gridSlug,
      fieldId: fieldSlug,
      config: ruleList as unknown[],
    });
  }

  return result;
}
