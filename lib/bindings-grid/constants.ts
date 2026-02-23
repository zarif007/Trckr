/**
 * Stable ids for the Bindings (Field mappings) UI on the Shared tab.
 * Used by ensureBindingsGrid and by consumers that read/write bindings grid data.
 */

export const BINDINGS_SECTION_ID = 'field_mappings_section'
export const BINDINGS_GRID_ID = 'bindings_grid'

export const BINDINGS_GRID_FIELD_IDS = [
  'binding_select_field',
  'binding_options_grid',
  'binding_label_field',
  'binding_fields_mapping',
] as const

export type BindingsGridFieldId = (typeof BINDINGS_GRID_FIELD_IDS)[number]
