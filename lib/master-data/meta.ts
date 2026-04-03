import { isPlainObject, normalizeName } from "./utils";

type Field = { id?: string; ui?: { label?: string }; dataType?: string };
type LayoutNode = { gridId?: string; fieldId?: string };
type Grid = { id?: string };

export type MasterDataMeta = {
  key?: string;
  gridId?: string;
  labelFieldId: string;
  fieldIds: string[];
  fieldLabels: string[];
  signature: string;
  updatedAt: string;
};

const LABEL_PRIORITY = [
  "name",
  "full_name",
  "fullname",
  "title",
  "label",
  "value",
];

function normalizeToken(value: string): string {
  return normalizeName(value);
}

export function resolveMasterDataGridId(
  schema: Record<string, unknown>,
  preferredId?: string | null,
): string | null {
  const grids = Array.isArray(schema.grids) ? (schema.grids as Grid[]) : [];
  const gridIds = grids
    .map((g) => g.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (gridIds.length === 0) return null;

  const metaGridId =
    isPlainObject(schema.masterDataMeta) &&
    typeof schema.masterDataMeta.gridId === "string"
      ? (schema.masterDataMeta.gridId as string)
      : null;
  const preferred =
    typeof preferredId === "string" && preferredId.trim().length > 0
      ? preferredId.trim()
      : null;

  const candidates = [metaGridId, preferred, "master_data_grid"];
  for (const candidate of candidates) {
    if (candidate && gridIds.includes(candidate)) return candidate;
  }

  const layoutNodes = Array.isArray(schema.layoutNodes)
    ? (schema.layoutNodes as LayoutNode[])
    : [];
  if (layoutNodes.length) {
    const counts = new Map<string, number>();
    for (const node of layoutNodes) {
      if (!node?.gridId) continue;
      counts.set(node.gridId, (counts.get(node.gridId) ?? 0) + 1);
    }
    let bestId: string | null = null;
    let bestCount = -1;
    for (const [gridId, count] of counts.entries()) {
      if (!gridIds.includes(gridId)) continue;
      if (count > bestCount) {
        bestCount = count;
        bestId = gridId;
      }
    }
    if (bestId) return bestId;
  }

  return gridIds[0] ?? null;
}

export function extractMasterDataFields(
  schema: Record<string, unknown>,
  preferredGridId?: string | null,
): {
  gridId: string | null;
  fieldIds: string[];
  fieldLabels: string[];
  fieldIdToLabel: Map<string, string>;
} {
  const fields = Array.isArray(schema.fields) ? (schema.fields as Field[]) : [];
  const layoutNodes = Array.isArray(schema.layoutNodes)
    ? (schema.layoutNodes as LayoutNode[])
    : [];
  const gridId = resolveMasterDataGridId(schema, preferredGridId);

  const fieldIdToLabel = new Map<string, string>();
  for (const field of fields) {
    if (!field?.id) continue;
    const label = field.ui?.label ?? field.id;
    fieldIdToLabel.set(field.id, label);
  }

  const fieldIdsInGrid = layoutNodes
    .filter((n) => gridId && n.gridId === gridId)
    .map((n) => n.fieldId)
    .filter((id): id is string => typeof id === "string");

  const fallbackFieldIds = fields
    .map((f) => f.id)
    .filter((id): id is string => typeof id === "string");
  const fieldIds = fieldIdsInGrid.length ? fieldIdsInGrid : fallbackFieldIds;
  const fieldLabels = fieldIds.map((id) => fieldIdToLabel.get(id) ?? id);

  return { gridId, fieldIds, fieldLabels, fieldIdToLabel };
}

export function resolveLabelFieldId(options: {
  fieldIds: string[];
  fieldIdToLabel: Map<string, string>;
  preferredId?: string | null;
}): string {
  const { fieldIds, fieldIdToLabel, preferredId } = options;
  if (preferredId && fieldIds.includes(preferredId)) return preferredId;

  for (const candidate of LABEL_PRIORITY) {
    const match = fieldIds.find(
      (id) => normalizeToken(id) === normalizeToken(candidate),
    );
    if (match) return match;
  }

  for (const id of fieldIds) {
    const label = fieldIdToLabel.get(id);
    if (!label) continue;
    const normalized = normalizeToken(label);
    if (LABEL_PRIORITY.some((c) => normalized.includes(normalizeToken(c)))) {
      return id;
    }
  }

  return fieldIds[0] ?? "value";
}

export function computeMasterDataSignature(
  fieldIds: string[],
  fieldLabels: string[],
): string {
  const ids = [...fieldIds]
    .map(normalizeToken)
    .filter(Boolean)
    .sort()
    .join("|");
  const labels = [...fieldLabels]
    .map(normalizeToken)
    .filter(Boolean)
    .sort()
    .join("|");
  return `ids:${ids};labels:${labels}`;
}

export function buildMasterDataMeta(options: {
  schema: Record<string, unknown>;
  key?: string;
  preferredLabelFieldId?: string | null;
}): MasterDataMeta {
  const { schema, key, preferredLabelFieldId } = options;
  const { fieldIds, fieldLabels, fieldIdToLabel, gridId } =
    extractMasterDataFields(schema);
  const labelFieldId = resolveLabelFieldId({
    fieldIds,
    fieldIdToLabel,
    preferredId: preferredLabelFieldId,
  });
  const signature = computeMasterDataSignature(fieldIds, fieldLabels);

  return {
    ...(key ? { key } : {}),
    ...(gridId ? { gridId } : {}),
    labelFieldId,
    fieldIds,
    fieldLabels,
    signature,
    updatedAt: new Date().toISOString(),
  };
}

export function readMasterDataMeta(
  schema: Record<string, unknown>,
): MasterDataMeta | null {
  if (!isPlainObject(schema.masterDataMeta)) return null;
  const raw = schema.masterDataMeta as Record<string, unknown>;
  if (typeof raw.labelFieldId !== "string") return null;
  if (!Array.isArray(raw.fieldIds) || !Array.isArray(raw.fieldLabels))
    return null;
  if (typeof raw.signature !== "string") return null;
  if (typeof raw.updatedAt !== "string") return null;
  if (raw.gridId != null && typeof raw.gridId !== "string") return null;
  return raw as MasterDataMeta;
}

export function withMasterDataMeta(options: {
  schema: Record<string, unknown>;
  key?: string;
  preferredLabelFieldId?: string | null;
}): Record<string, unknown> {
  const meta = buildMasterDataMeta({
    schema: options.schema,
    key: options.key,
    preferredLabelFieldId: options.preferredLabelFieldId,
  });
  return { ...options.schema, masterDataMeta: meta };
}
