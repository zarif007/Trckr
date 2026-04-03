export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeName(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const alnum = trimmed.replace(/[^a-z0-9]+/g, "");
  if (alnum.length > 3 && alnum.endsWith("s")) return alnum.slice(0, -1);
  return alnum;
}

export function toSnakeId(value: string, fallback = "master_data"): string {
  const base = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return base || fallback;
}

export function createMasterDataGridId(
  name: string,
  existingIds?: Set<string>,
): string {
  const base = toSnakeId(name);
  const baseId = base.endsWith("_grid") ? base : `${base}_grid`;
  if (!existingIds || existingIds.size === 0) return baseId;
  let id = baseId;
  let n = 1;
  while (existingIds.has(id)) {
    id = `${baseId}_${n}`;
    n += 1;
  }
  return id;
}

export function createMasterDataSectionId(
  name: string,
  existingIds?: Set<string>,
): string {
  const base = toSnakeId(name);
  const baseId = `${base}_master_data_section`;
  if (!existingIds || existingIds.size === 0) return baseId;
  let id = baseId;
  let n = 1;
  while (existingIds.has(id)) {
    id = `${baseId}_${n}`;
    n += 1;
  }
  return id;
}
