import { createHash } from "node:crypto";

import type { FieldCatalog } from "./field-catalog";

/**
 * Stable hash when tracker field layout changes; invalidates cached report/analysis definitions.
 */
export function fingerprintFromCatalog(catalog: FieldCatalog): string {
  const payload = {
    fields: [...catalog.fields].sort((a, b) => {
      const g = a.gridId.localeCompare(b.gridId);
      if (g !== 0) return g;
      return a.fieldId.localeCompare(b.fieldId);
    }),
    gridIds: [...catalog.gridIds].sort(),
  };
  const json = JSON.stringify(payload);
  return createHash("sha256").update(json).digest("hex").slice(0, 32);
}
