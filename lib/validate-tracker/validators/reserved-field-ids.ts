/**
 * Validates that no field uses a reserved system id (e.g. row_id).
 */

import { RESERVED_FIELD_IDS } from "@/lib/schemas/tracker";
import type { ValidationContext, ValidatorResult } from "../types";

const reservedSet = new Set<string>(RESERVED_FIELD_IDS);

export function validateReservedFieldIds(
  ctx: ValidationContext,
): ValidatorResult {
  const errors: string[] = [];

  for (const field of ctx.fields) {
    if (reservedSet.has(field.id)) {
      errors.push(`Field id "${field.id}" is reserved for system use`);
    }
  }

  for (const node of ctx.layoutNodes) {
    if (reservedSet.has(node.fieldId)) {
      errors.push(`layoutNode references reserved fieldId "${node.fieldId}"`);
    }
  }

  return { errors };
}
