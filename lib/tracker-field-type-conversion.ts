import type { TrackerFieldType } from "@/lib/tracker-field-types";
import { TRACKER_FIELD_TYPES } from "@/lib/tracker-field-types";

/**
 * Semantic families for conversion policy (see plan: widening vs narrowing).
 * Cross-family moves are mostly disallowed except numeric → text.
 */
type FieldTypeFamily =
  | "text"
  | "numeric"
  | "choiceSingle"
  | "choiceMulti"
  | "person"
  | "date"
  | "boolean"
  | "files"
  | "fieldMappings";

const TEXT_LIKE = new Set<TrackerFieldType>([
  "string",
  "text",
  "link",
  "email",
  "phone",
  "url",
]);

const NUMERIC_LIKE = new Set<TrackerFieldType>([
  "number",
  "currency",
  "percentage",
  "rating",
]);

/** Single-valued choice controls (options, status, dynamic single). */
const CHOICE_SINGLE = new Set<TrackerFieldType>([
  "options",
  "status",
  "dynamic_select",
]);

const CHOICE_MULTI = new Set<TrackerFieldType>([
  "multiselect",
  "dynamic_multiselect",
]);

export function fieldTypeFamily(t: TrackerFieldType): FieldTypeFamily | null {
  if (TEXT_LIKE.has(t)) return "text";
  if (NUMERIC_LIKE.has(t)) return "numeric";
  if (CHOICE_SINGLE.has(t)) return "choiceSingle";
  if (CHOICE_MULTI.has(t)) return "choiceMulti";
  if (t === "person") return "person";
  if (t === "date") return "date";
  if (t === "boolean") return "boolean";
  if (t === "files") return "files";
  if (t === "field_mappings") return "fieldMappings";
  return null;
}

/**
 * Whether an existing field may change from `from` to `to`.
 * New fields (no prior row in DB for that slug) are not checked here — callers skip when slug is absent.
 */
export function isFieldDataTypeChangeAllowed(
  from: TrackerFieldType,
  to: TrackerFieldType,
): boolean {
  if (from === to) return true;

  const fromFam = fieldTypeFamily(from);
  const toFam = fieldTypeFamily(to);
  if (fromFam === null || toFam === null) return false;

  if (fromFam === toFam) return true;

  if (fromFam === "numeric" && toFam === "text") return true;

  return false;
}

export function listAllowedTargetDataTypes(
  from: TrackerFieldType,
): TrackerFieldType[] {
  return TRACKER_FIELD_TYPES.filter((to) =>
    isFieldDataTypeChangeAllowed(from, to),
  );
}

export type FieldDataTypeChangeViolation = {
  slug: string;
  from: TrackerFieldType;
  to: TrackerFieldType;
};

export function findDisallowedFieldDataTypeChanges(params: {
  existingBySlug: Map<string, TrackerFieldType>;
  incomingFields: Array<{ slug: string; dataType: string }>;
}): FieldDataTypeChangeViolation[] {
  const violations: FieldDataTypeChangeViolation[] = [];
  for (const field of params.incomingFields) {
    const prev = params.existingBySlug.get(field.slug);
    if (prev === undefined) continue;
    if (!isTrackerFieldType(field.dataType)) continue;
    const next = field.dataType;
    if (!isFieldDataTypeChangeAllowed(prev, next)) {
      violations.push({ slug: field.slug, from: prev, to: next });
    }
  }
  return violations;
}

function isTrackerFieldType(v: string): v is TrackerFieldType {
  return (TRACKER_FIELD_TYPES as readonly string[]).includes(v);
}
