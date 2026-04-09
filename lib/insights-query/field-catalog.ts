/**
 * Derive a stable field catalog from tracker schema data for LLM context
 * and fingerprinting (reports and analyses).
 *
 * Accepts either a flat schema object (legacy) or normalized DB includes
 * (nodes, fields, layoutNodes).
 */

export type FieldCatalogEntry = {
  gridId: string;
  gridName: string;
  fieldId: string;
  label: string;
  dataType: string;
};

export type FieldCatalog = {
  fields: FieldCatalogEntry[];
  gridIds: string[];
};

/**
 * Build a field catalog from a normalized tracker schema that includes
 * nodes, fields, and layoutNodes from the DB.
 */
export function buildFieldCatalogFromNormalized(trackerSchema: {
  nodes: Array<{ type: string; slug: string; name: string }>;
  fields: Array<{ slug: string; dataType: string; ui: unknown }>;
  layoutNodes: Array<{ gridId: string; fieldId: string }>;
}): FieldCatalog {
  const gridNodes = trackerSchema.nodes.filter((n) => n.type === "GRID");
  const fieldMap = new Map(trackerSchema.fields.map((f) => [f.slug, f]));

  const gridFields = new Map<string, string[]>();
  for (const ln of trackerSchema.layoutNodes) {
    const gridNode = trackerSchema.nodes.find((n) => n.slug === ln.gridId || n.type === "GRID");
    if (!gridNode) continue;
    const field = trackerSchema.fields.find((f) => f.slug === ln.fieldId);
    if (!field) continue;
    const list = gridFields.get(gridNode.slug) ?? [];
    list.push(field.slug);
    gridFields.set(gridNode.slug, list);
  }

  const entries: FieldCatalogEntry[] = [];
  const gridIds: string[] = [];

  for (const grid of gridNodes) {
    gridIds.push(grid.slug);
    const fieldIds = gridFields.get(grid.slug) ?? [];
    for (const fSlug of fieldIds) {
      const field = fieldMap.get(fSlug);
      if (!field) continue;
      const ui = field.ui as Record<string, unknown> | undefined;
      const label = String(ui?.label ?? fSlug);
      entries.push({
        gridId: grid.slug,
        gridName: grid.name,
        fieldId: fSlug,
        label,
        dataType: field.dataType,
      });
    }
  }

  return { fields: entries, gridIds };
}

export function buildFieldCatalog(trackerSchema: unknown): FieldCatalog {
  if (!trackerSchema || typeof trackerSchema !== "object") {
    return { fields: [], gridIds: [] };
  }

  const s = trackerSchema as Record<string, unknown>;
  const grids = Array.isArray(s.grids) ? s.grids : [];
  const fields = Array.isArray(s.fields) ? s.fields : [];
  const layoutNodes = Array.isArray(s.layoutNodes) ? s.layoutNodes : [];

  const fieldMap = new Map<string, Record<string, unknown>>();
  for (const f of fields) {
    if (f && typeof f === "object" && "id" in f) {
      fieldMap.set(
        String((f as Record<string, unknown>).id),
        f as Record<string, unknown>,
      );
    }
  }

  const gridFields = new Map<string, string[]>();
  for (const ln of layoutNodes) {
    if (!ln || typeof ln !== "object") continue;
    const node = ln as Record<string, unknown>;
    const gridId = String(node.gridId ?? "");
    const fieldId = String(node.fieldId ?? "");
    if (!gridId || !fieldId) continue;
    const list = gridFields.get(gridId) ?? [];
    list.push(fieldId);
    gridFields.set(gridId, list);
  }

  const entries: FieldCatalogEntry[] = [];
  const gridIds: string[] = [];

  for (const g of grids) {
    if (!g || typeof g !== "object") continue;
    const grid = g as Record<string, unknown>;
    const gridId = String(grid.id ?? "");
    const gridName = String(grid.name ?? gridId);
    if (!gridId) continue;
    gridIds.push(gridId);

    const fieldIds = gridFields.get(gridId) ?? [];
    for (const fId of fieldIds) {
      const field = fieldMap.get(fId);
      if (!field) continue;
      const label = String(
        (field.ui as Record<string, unknown> | undefined)?.label ??
          field.id ??
          fId,
      );
      const dataType = String(field.dataType ?? "text");
      entries.push({ gridId, gridName, fieldId: fId, label, dataType });
    }
  }

  return { fields: entries, gridIds };
}

export function formatCatalogForPrompt(catalog: FieldCatalog): string {
  if (catalog.fields.length === 0)
    return "(no fields catalog — schema may be empty)";
  const byGrid = new Map<string, FieldCatalogEntry[]>();
  for (const f of catalog.fields) {
    const list = byGrid.get(f.gridId) ?? [];
    list.push(f);
    byGrid.set(f.gridId, list);
  }
  const parts: string[] = [];
  for (const [gridId, list] of byGrid) {
    parts.push(`### Grid \`${gridId}\` (${list[0]?.gridName ?? gridId})`);
    for (const f of list) {
      parts.push(
        `- fieldId=\`${f.fieldId}\` label="${f.label}" type=${f.dataType}`,
      );
    }
    parts.push("");
  }
  return parts.join("\n");
}
