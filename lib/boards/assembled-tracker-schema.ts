/**
 * Minimal tracker schema shape needed to configure board widgets (grids, fields, layout).
 * Fetched from the client via `/api/trackers/:id` — keep in sync with that response.
 */
export type AssembledSchema = {
  grids?: { id: string; name: string }[];
  fields?: { id: string; dataType?: string; ui?: { label?: string } }[];
  layoutNodes?: { gridId: string; fieldId: string }[];
};

/** Browser-only: loads assembled display schema for binding pickers. */
export async function fetchTrackerAssembledSchema(
  trackerId: string,
): Promise<AssembledSchema | null> {
  const res = await fetch(`/api/trackers/${trackerId}`);
  if (!res.ok) return null;
  const body = (await res.json()) as { schema?: AssembledSchema };
  return body.schema ?? null;
}

export function layoutFieldIdsForGrid(
  schema: AssembledSchema | null,
  gridId: string,
): string[] {
  if (!schema?.layoutNodes) return [];
  return schema.layoutNodes
    .filter((n) => n.gridId === gridId)
    .map((n) => n.fieldId);
}

export function fieldLabelFromAssembledSchema(
  schema: AssembledSchema | null,
  fieldId: string,
): string {
  const f = schema?.fields?.find((x) => x.id === fieldId);
  const lab =
    f?.ui && typeof f.ui === "object" && "label" in f.ui
      ? (f.ui as { label?: string }).label
      : undefined;
  return typeof lab === "string" && lab.trim() ? lab : fieldId.slice(0, 8);
}
