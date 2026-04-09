/**
 * Assembles normalized DB rows into the flat TrackerDisplayProps shape
 * consumed by UI components and runtime engines.
 */

import type {
  FullTrackerSchema,
  TrackerNodeRow,
  TrackerFieldRow,
  TrackerLayoutNodeRow,
  TrackerBindingRow,
  TrackerValidationRow,
  TrackerCalculationRow,
  TrackerFieldRuleRow,
} from "@/lib/schemas/tracker";
import type {
  TrackerDisplayProps,
  TrackerTab,
  TrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerFormAction,
  TrackerGridView,
} from "@/app/components/tracker-display/types";
import type { TrackerBindings, TrackerBindingEntry } from "@/lib/types/tracker-bindings";
import type { FieldValidationRule, FieldCalculationRule } from "@/lib/functions/types";
import type { FieldRulesMap, FieldRule } from "@/lib/field-rules";

// ---------------------------------------------------------------------------
// Main assembler
// ---------------------------------------------------------------------------

export function assembleTrackerDisplayProps(
  schema: FullTrackerSchema,
): TrackerDisplayProps {
  const nodeMap = new Map(schema.nodes.map((n) => [n.id, n]));
  const fieldMap = new Map(schema.fields.map((f) => [f.id, f]));

  const tabs = assembleTabs(schema.nodes);
  const sections = assembleSections(schema.nodes, nodeMap);
  const grids = assembleGrids(schema.nodes, nodeMap);
  const fields = assembleFields(schema.fields);
  const layoutNodes = assembleLayoutNodes(schema.layoutNodes, nodeMap, fieldMap);
  const bindings = assembleBindings(schema.bindings, nodeMap, fieldMap);
  const validations = assembleValidations(schema.validations, nodeMap, fieldMap);
  const calculations = assembleCalculations(schema.calculations, nodeMap, fieldMap);
  const fieldRulesV2 = assembleFieldRules(schema.fieldRules, nodeMap, fieldMap);

  const meta = schema.meta;
  const formActions = meta?.formActions as TrackerFormAction[] | undefined;
  const masterDataScope = meta?.masterDataScope as TrackerDisplayProps["masterDataScope"];

  return {
    name: schema.name ?? undefined,
    masterDataScope,
    tabs,
    sections,
    grids,
    fields,
    formActions,
    layoutNodes,
    bindings,
    validations,
    calculations,
    fieldRulesV2,
    trackerSchemaId: schema.id,
    projectId: schema.projectId,
  };
}

// ---------------------------------------------------------------------------
// Node assemblers
// ---------------------------------------------------------------------------

function assembleTabs(nodes: TrackerNodeRow[]): TrackerTab[] {
  return nodes
    .filter((n) => n.type === "TAB")
    .sort((a, b) => a.placeId - b.placeId)
    .map((n) => ({
      id: n.slug,
      name: n.name,
      placeId: n.placeId,
      config: n.config ?? undefined,
    }));
}

function assembleSections(
  nodes: TrackerNodeRow[],
  nodeMap: Map<string, TrackerNodeRow>,
): TrackerSection[] {
  return nodes
    .filter((n) => n.type === "SECTION")
    .sort((a, b) => a.placeId - b.placeId)
    .map((n) => {
      const parent = n.parentId ? nodeMap.get(n.parentId) : undefined;
      return {
        id: n.slug,
        name: n.name,
        tabId: parent?.slug ?? "",
        placeId: n.placeId,
        config: n.config ?? undefined,
      };
    });
}

function assembleGrids(
  nodes: TrackerNodeRow[],
  nodeMap: Map<string, TrackerNodeRow>,
): TrackerGrid[] {
  return nodes
    .filter((n) => n.type === "GRID")
    .sort((a, b) => a.placeId - b.placeId)
    .map((n) => {
      const parent = n.parentId ? nodeMap.get(n.parentId) : undefined;
      return {
        id: n.slug,
        name: n.name,
        sectionId: parent?.slug ?? "",
        placeId: n.placeId,
        config: n.config ?? undefined,
        views: (n.views as TrackerGridView[]) ?? [],
      };
    });
}

// ---------------------------------------------------------------------------
// Field assembler
// ---------------------------------------------------------------------------

function assembleFields(fields: TrackerFieldRow[]): TrackerField[] {
  return fields.map((f) => ({
    id: f.slug,
    dataType: f.dataType as TrackerField["dataType"],
    ui: {
      label: f.ui.label,
      placeholder: f.ui.placeholder,
    },
    config: f.config ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Layout node assembler
// ---------------------------------------------------------------------------

function assembleLayoutNodes(
  layoutNodes: TrackerLayoutNodeRow[],
  nodeMap: Map<string, TrackerNodeRow>,
  fieldMap: Map<string, TrackerFieldRow>,
): TrackerLayoutNode[] {
  return layoutNodes
    .sort((a, b) => a.order - b.order)
    .map((ln) => {
      const grid = nodeMap.get(ln.gridId);
      const field = fieldMap.get(ln.fieldId);
      return {
        gridId: grid?.slug ?? "",
        fieldId: field?.slug ?? "",
        order: ln.order,
        row: ln.row ?? undefined,
        col: ln.col ?? undefined,
        renderAs: ln.renderAs as TrackerLayoutNode["renderAs"],
      };
    });
}

// ---------------------------------------------------------------------------
// Binding assembler
// ---------------------------------------------------------------------------

function assembleBindings(
  bindings: TrackerBindingRow[],
  nodeMap: Map<string, TrackerNodeRow>,
  fieldMap: Map<string, TrackerFieldRow>,
): TrackerBindings {
  const result: TrackerBindings = {};
  for (const b of bindings) {
    const targetGrid = nodeMap.get(b.targetGridId);
    const targetField = fieldMap.get(b.targetFieldId);
    if (!targetGrid || !targetField) continue;

    const key = `${targetGrid.slug}.${targetField.slug}`;
    const entry: TrackerBindingEntry = {
      optionsGrid: b.config.optionsGrid,
      labelField: b.config.labelField,
      fieldMappings: b.config.fieldMappings ?? [],
    };
    if (b.config.optionsSourceSchemaId) {
      entry.optionsSourceSchemaId = b.config.optionsSourceSchemaId;
    }
    if (b.config.optionsSourceKey) {
      entry.optionsSourceKey = b.config.optionsSourceKey;
    }
    result[key] = entry;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Validation assembler
// ---------------------------------------------------------------------------

function assembleValidations(
  validations: TrackerValidationRow[],
  nodeMap: Map<string, TrackerNodeRow>,
  fieldMap: Map<string, TrackerFieldRow>,
): Record<string, FieldValidationRule[]> {
  const result: Record<string, FieldValidationRule[]> = {};
  for (const v of validations) {
    const grid = nodeMap.get(v.gridId);
    const field = fieldMap.get(v.fieldId);
    if (!grid || !field) continue;
    const key = `${grid.slug}.${field.slug}`;
    result[key] = v.rules as FieldValidationRule[];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Calculation assembler
// ---------------------------------------------------------------------------

function assembleCalculations(
  calculations: TrackerCalculationRow[],
  nodeMap: Map<string, TrackerNodeRow>,
  fieldMap: Map<string, TrackerFieldRow>,
): Record<string, FieldCalculationRule> {
  const result: Record<string, FieldCalculationRule> = {};
  for (const c of calculations) {
    const grid = nodeMap.get(c.gridId);
    const field = fieldMap.get(c.fieldId);
    if (!grid || !field) continue;
    const key = `${grid.slug}.${field.slug}`;
    result[key] = c.expression as FieldCalculationRule;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Field rules assembler
// ---------------------------------------------------------------------------

function assembleFieldRules(
  fieldRules: TrackerFieldRuleRow[],
  nodeMap: Map<string, TrackerNodeRow>,
  fieldMap: Map<string, TrackerFieldRow>,
): FieldRulesMap | undefined {
  if (fieldRules.length === 0) return undefined;
  const result: FieldRulesMap = {};
  for (const r of fieldRules) {
    const grid = nodeMap.get(r.gridId);
    const field = fieldMap.get(r.fieldId);
    if (!grid || !field) continue;
    const key = `${grid.slug}.${field.slug}`;
    result[key] = r.config as FieldRule[];
  }
  return result;
}
