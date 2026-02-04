/**
 * Domain types for the tracker bindings system.
 * Used by resolve-bindings, resolve-options, and UI components.
 */

/** Dot-notation path: "grid_id.field_id" (no tab) */
export type FieldPath = string

/** Single field mapping for auto-population when an option is selected */
export type FieldMapping = {
  /** Path in options grid: "product_options_grid.price" */
  from: FieldPath
  /** Path in main grid: "orders_grid.price" */
  to: FieldPath
}

/** Binding entry for a select/multiselect field */
export type TrackerBindingEntry = {
  /** Grid id containing options (e.g. "product_options_grid") */
  optionsGrid: string
  /** Path to label field: "product_options_grid.label" */
  labelField: FieldPath
  /**
   * Field mappings: from option row field -> to main grid field.
   * Must include one mapping where "to" is this select field path (that "from" is the stored value).
   * Other mappings auto-populate when an option is selected.
   */
  fieldMappings: FieldMapping[]
}

/** Top-level bindings object. Key is "grid_id.field_id" */
export type TrackerBindings = Record<FieldPath, TrackerBindingEntry>
