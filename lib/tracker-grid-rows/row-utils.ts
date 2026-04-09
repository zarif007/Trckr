import type { GridRowRecord } from "./types";

export function rowIdFromRow(row: GridRowRecord): string | undefined {
  const id = row._rowId ?? row.row_id;
  if (typeof id === "string" && id.length > 0) return id;
  return undefined;
}

/**
 * Strips `_prefixed` server/meta keys before PATCHing row `data` on the server.
 */
export function rowPayloadForPatch(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith("_")) continue;
    out[k] = v;
  }
  return out;
}
