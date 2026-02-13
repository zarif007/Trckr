/**
 * Types used by the binding resolution engine.
 * FieldPath and binding entry types live in @/lib/types/tracker-bindings.
 */

/** Parsed path components. Path format is grid.field (no tab). */
export interface ParsedPath {
  tabId: null
  gridId: string | null
  fieldId: string | null
}
